// Settings management endpoint
export async function onRequestGet(context) {
  try {
    const { env } = context;

    // Get all settings from database
    const stmt = env.DB.prepare('SELECT key, value FROM settings');
    const { results } = await stmt.all();

    // Convert to object format
    const settings = {};
    results?.forEach(row => {
      settings[row.key] = row.value;
    });

    return new Response(JSON.stringify(settings), {
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

    const { key, value } = updateData;

    if (!key) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Setting key is required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Check if setting exists
    const checkStmt = env.DB.prepare('SELECT key FROM settings WHERE key = ?');
    const existing = await checkStmt.bind(key).first();

    if (existing) {
      // Update existing setting
      const updateStmt = env.DB.prepare('UPDATE settings SET value = ?, updatedAt = ? WHERE key = ?');
      await updateStmt.bind(value, new Date().toISOString(), key).run();
    } else {
      // Insert new setting
      const insertStmt = env.DB.prepare(`
        INSERT INTO settings (key, value, category, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?)
      `);
      const now = new Date().toISOString();
      await insertStmt.bind(key, value, 'general', now, now).run();
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Setting updated successfully'
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
