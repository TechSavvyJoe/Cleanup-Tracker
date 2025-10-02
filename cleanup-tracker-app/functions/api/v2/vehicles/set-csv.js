// Vehicle CSV URL configuration endpoint
export async function onRequestPost(context) {
  try {
    const { env, request } = context;
    const { url } = await request.json();

    if (!url) {
      return new Response(JSON.stringify({
        success: false,
        message: 'CSV URL is required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Invalid URL format'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Save to settings table with snake_case key
    const checkStmt = env.DB.prepare("SELECT value FROM settings WHERE key = 'inventory_csv_url'");
    const existing = await checkStmt.first();

    if (existing) {
      // Update existing setting
      const updateStmt = env.DB.prepare("UPDATE settings SET value = ?, updatedAt = ? WHERE key = 'inventory_csv_url'");
      await updateStmt.bind(url, new Date().toISOString()).run();
    } else {
      // Insert new setting
      const insertStmt = env.DB.prepare(`
        INSERT INTO settings (key, value, category, createdAt, updatedAt)
        VALUES ('inventory_csv_url', ?, 'inventory', ?, ?)
      `);
      const now = new Date().toISOString();
      await insertStmt.bind(url, now, now).run();
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'CSV URL configured successfully',
      url: url
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Error configuring CSV URL',
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
