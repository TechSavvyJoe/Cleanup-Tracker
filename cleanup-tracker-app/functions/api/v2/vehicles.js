// Vehicles management endpoint - temporary workaround for D1 issue
export async function onRequestGet(context) {
  try {
    const { request } = context;
    const url = new URL(request.url);
    const search = url.searchParams.get('search');

    // Temporary static vehicle data (replace with D1 when issue is resolved)
    const staticVehicles = [
      {
        id: 1,
        vin: 'JH4DC4940RS123456',
        stockNumber: 'ST001',
        year: 2022,
        make: 'Honda',
        model: 'Civic',
        trim: 'LX',
        color: 'Silver',
        vehicleDescription: '2022 Honda Civic LX - Clean',
        status: 'available',
        location: 'Lot A',
        notes: 'Ready for detail',
        createdAt: '2025-10-01T10:00:00Z',
        updatedAt: '2025-10-01T10:00:00Z'
      },
      {
        id: 2,
        vin: 'WBANE53597CT12345',
        stockNumber: 'ST002',
        year: 2023,
        make: 'BMW',
        model: '3 Series',
        trim: '330i',
        color: 'Black',
        vehicleDescription: '2023 BMW 3 Series 330i - Premium',
        status: 'in-service',
        location: 'Bay 2',
        notes: 'Detail in progress',
        createdAt: '2025-10-01T09:30:00Z',
        updatedAt: '2025-10-01T14:30:00Z'
      },
      {
        id: 3,
        vin: '5NPE34AF4DH123789',
        stockNumber: 'ST003',
        year: 2021,
        make: 'Hyundai',
        model: 'Sonata',
        trim: 'SEL',
        color: 'White',
        vehicleDescription: '2021 Hyundai Sonata SEL - Good condition',
        status: 'maintenance',
        location: 'Shop',
        notes: 'Minor repair needed',
        createdAt: '2025-10-01T08:00:00Z',
        updatedAt: '2025-10-01T12:00:00Z'
      }
    ];

    let results = staticVehicles;

    // Apply search filter if provided
    if (search) {
      const searchLower = search.toLowerCase();
      results = staticVehicles.filter(vehicle =>
        vehicle.vin?.toLowerCase().includes(searchLower) ||
        vehicle.stockNumber?.toLowerCase().includes(searchLower) ||
        vehicle.make?.toLowerCase().includes(searchLower) ||
        vehicle.model?.toLowerCase().includes(searchLower)
      );
    }

    return new Response(JSON.stringify({
      success: true,
      vehicles: results
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Error fetching vehicles',
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

export async function onRequestPost(context) {
  try {
    const { env, request } = context;
    const vehicleData = await request.json();

    if (Array.isArray(vehicleData)) {
      // Bulk import from CSV
      const insertedCount = await bulkImportVehicles(env.DB, vehicleData);

      return new Response(JSON.stringify({
        success: true,
        message: `Imported ${insertedCount} vehicles`,
        count: insertedCount
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    } else {
      // Single vehicle creation
      const {
        vin,
        stockNumber,
        year,
        make,
        model,
        trim,
        color,
        vehicleDescription,
        status = 'available',
        location,
        notes
      } = vehicleData;

      if (!vin) {
        return new Response(JSON.stringify({
          success: false,
          message: 'VIN is required'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        });
      }

      const stmt = env.DB.prepare(`
        INSERT OR REPLACE INTO vehicles (
          vin, stockNumber, year, make, model, trim, color,
          vehicleDescription, status, location, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      const result = await stmt.bind(
        vin, stockNumber, year, make, model, trim, color,
        vehicleDescription, status, location, notes
      ).run();

      return new Response(JSON.stringify({
        success: true,
        vehicleId: result.meta.last_row_id,
        message: 'Vehicle created successfully'
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Error creating vehicle(s)',
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

async function bulkImportVehicles(db, vehicles) {
  let insertedCount = 0;

  for (const vehicle of vehicles) {
    try {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO vehicles (
          vin, stockNumber, year, make, model, trim, color,
          vehicleDescription, status, location, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);

      await stmt.bind(
        vehicle.vin || '',
        vehicle.stockNumber || '',
        vehicle.year || null,
        vehicle.make || '',
        vehicle.model || '',
        vehicle.trim || '',
        vehicle.color || '',
        vehicle.vehicleDescription || `${vehicle.year} ${vehicle.make} ${vehicle.model}`,
        vehicle.status || 'available',
        vehicle.location || '',
        vehicle.notes || ''
      ).run();

      insertedCount++;
    } catch (error) {
      console.error(`Error importing vehicle ${vehicle.vin}:`, error);
    }
  }

  return insertedCount;
}

// Handle CORS preflight
export async function onRequestOptions(context) {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}