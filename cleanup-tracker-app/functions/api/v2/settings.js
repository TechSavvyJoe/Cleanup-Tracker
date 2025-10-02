// Settings management endpoint
export async function onRequestGet(context) {
  try {
    const { env } = context;

    // Get all settings from database
    const stmt = env.DB.prepare('SELECT key, value FROM settings');
    const { results } = await stmt.all();

    // Convert to object format with camelCase keys for frontend
    const settings = {};
    results?.forEach(row => {
      // Convert snake_case to camelCase for frontend compatibility
      const camelKey = row.key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      settings[camelKey] = row.value;
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

    // Convert camelCase to snake_case for database storage
    const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();

    // Check if setting exists
    const checkStmt = env.DB.prepare('SELECT key FROM settings WHERE key = ?');
    const existing = await checkStmt.bind(dbKey).first();

    if (existing) {
      // Update existing setting
      const updateStmt = env.DB.prepare('UPDATE settings SET value = ?, updatedAt = ? WHERE key = ?');
      await updateStmt.bind(value, new Date().toISOString(), dbKey).run();
    } else {
      // Insert new setting
      const insertStmt = env.DB.prepare(`
        INSERT INTO settings (key, value, category, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?)
      `);
      const now = new Date().toISOString();
      await insertStmt.bind(dbKey, value, 'general', now, now).run();
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
