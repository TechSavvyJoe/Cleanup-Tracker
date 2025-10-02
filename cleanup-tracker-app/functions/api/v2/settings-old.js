// Settings management endpoint - temporary workaround for D1 issue
export async function onRequestGet(context) {
  try {
    // Temporary static settings (replace with D1 when issue is resolved)
    const staticSettings = {
      siteTitle: 'Cleanup Tracker',
      inventoryCsvUrl: '',
      theme: 'light'
    };

    return new Response(JSON.stringify(staticSettings), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Error fetching settings',
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

export async function onRequestPut(context) {
  try {
    const { env, request } = context;
    const updateData = await request.json();

    // Update or insert settings
    const stmt = env.DB.prepare(`
      INSERT OR REPLACE INTO settings (id, siteTitle, theme, timezone, updatedAt)
      VALUES (1, ?, ?, ?, ?)
    `);

    await stmt.bind(
      updateData.siteTitle || 'Cleanup Tracker',
      updateData.theme || 'light',
      updateData.timezone || 'UTC',
      new Date().toISOString()
    ).run();

    return new Response(JSON.stringify({
      success: true,
      message: 'Settings updated successfully'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error updating settings',
      message: error.message
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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}