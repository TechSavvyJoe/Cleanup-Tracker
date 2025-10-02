// Vehicle inventory refresh endpoint - CSV import from Google Sheets
export async function onRequestPost(context) {
  try {
    const { env } = context;

    // Get CSV URL from settings
    const settingsStmt = env.DB.prepare("SELECT value FROM settings WHERE key = 'inventory_csv_url'");
    const csvUrlRow = await settingsStmt.first();
    
    if (!csvUrlRow || !csvUrlRow.value) {
      return new Response(JSON.stringify({
        success: false,
        message: 'CSV URL not configured. Please set the inventory CSV URL in settings.'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const csvUrl = csvUrlRow.value;
    const startTime = new Date().toISOString();

    // Fetch CSV from Google Sheets
    const csvResponse = await fetch(csvUrl);
    if (!csvResponse.ok) {
      throw new Error(`Failed to fetch CSV: ${csvResponse.statusText}`);
    }

    const csvText = await csvResponse.text();
    const lines = csvText.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      throw new Error('CSV file is empty or has no data rows');
    }

    // Parse CSV headers
    const headers = lines[0].split(',').map(h => h.trim().replace(/['"]/g, ''));
    
    let imported = 0;
    let updated = 0;
    let errors = 0;
    const errorDetails = [];

    // Process each data row
    for (let i = 1; i < lines.length; i++) {
      try {
        const values = lines[i].split(',').map(v => v.trim().replace(/['"]/g, ''));
        const row = {};
        
        headers.forEach((header, index) => {
          row[header.toLowerCase().replace(/\s+/g, '_')] = values[index] || '';
        });

        // Map common column names to database fields
        const vin = row.vin || row.vehicle_identification_number || '';
        const stockNumber = row.stock_number || row.stock_no || row.stock || '';
        const year = row.year || row.model_year || '';
        const make = row.make || row.manufacturer || '';
        const model = row.model || '';
        const trim = row.trim || row.trim_level || '';
        const color = row.color || row.exterior_color || '';
        const mileage = row.mileage || row.odometer || '0';
        const description = row.description || row.vehicle_description || `${year} ${make} ${model}`.trim();

        if (!vin) {
          errorDetails.push(`Row ${i + 1}: Missing VIN`);
          errors++;
          continue;
        }

        // Check if vehicle exists
        const checkStmt = env.DB.prepare('SELECT vin FROM vehicles WHERE vin = ?');
        const existing = await checkStmt.bind(vin).first();

        if (existing) {
          // Update existing vehicle
          const updateStmt = env.DB.prepare(`
            UPDATE vehicles 
            SET stockNumber = ?, year = ?, make = ?, model = ?, trim = ?, 
                color = ?, mileage = ?, vehicleDescription = ?, updatedAt = ?
            WHERE vin = ?
          `);
          await updateStmt.bind(
            stockNumber, year, make, model, trim, color, mileage, 
            description, new Date().toISOString(), vin
          ).run();
          updated++;
        } else {
          // Insert new vehicle
          const insertStmt = env.DB.prepare(`
            INSERT INTO vehicles (
              vin, stockNumber, year, make, model, trim, color, 
              mileage, vehicleDescription, status, createdAt, updatedAt
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `);
          const now = new Date().toISOString();
          await insertStmt.bind(
            vin, stockNumber, year, make, model, trim, color,
            mileage, description, 'available', now, now
          ).run();
          imported++;
        }
      } catch (rowError) {
        errorDetails.push(`Row ${i + 1}: ${rowError.message}`);
        errors++;
      }
    }

    // Log the refresh operation
    const logStmt = env.DB.prepare(`
      INSERT INTO inventory_refresh_log (srcUrl, startedAt, finishedAt, rowsTotal, upserted, modified, error)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    await logStmt.bind(
      csvUrl,
      startTime,
      new Date().toISOString(),
      lines.length - 1,
      imported,
      updated,
      errors > 0 ? errorDetails.join('; ') : null
    ).run();

    return new Response(JSON.stringify({
      success: true,
      message: 'Inventory refresh completed',
      imported,
      updated,
      errors,
      totalRows: lines.length - 1,
      errorDetails: errors > 0 ? errorDetails : undefined
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Error refreshing inventory',
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

// Handle CORS preflight
export async function onRequestOptions(context) {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
