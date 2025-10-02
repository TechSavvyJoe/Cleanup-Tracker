// Users management endpoint for Cloudflare Workers with D1
export async function onRequestGet(context) {
  try {
    const { env } = context;

    const stmt = env.DB.prepare('SELECT * FROM users WHERE isActive = true ORDER BY name ASC');
    const { results } = await stmt.all();

    return new Response(JSON.stringify({
      users: results || []
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error fetching users',
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

export async function onRequestPost(context) {
  try {
    const { env, request } = context;
    const userData = await request.json();

    const {
      name,
      pin,
      role = 'technician',
      employeeId
    } = userData;

    if (!name || !pin) {
      return new Response(JSON.stringify({
        error: 'Name and PIN are required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    const stmt = env.DB.prepare(`
      INSERT INTO users (name, pin, role, employeeId, isActive, createdAt)
      VALUES (?, ?, ?, ?, true, ?)
    `);

    const result = await stmt.bind(
      name,
      pin,
      role,
      employeeId || pin,
      new Date().toISOString()
    ).run();

    return new Response(JSON.stringify({
      success: true,
      userId: result.meta.last_row_id,
      message: 'User created successfully'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error creating user',
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

export async function onRequestPut(context) {
  try {
    const { env, request } = context;
    const updateData = await request.json();
    const url = new URL(request.url);
    const userId = url.pathname.split('/').pop();

    if (!userId || userId === 'users') {
      return new Response(JSON.stringify({
        error: 'User ID is required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    let updateFields = [];
    let params = [];

    if (updateData.name !== undefined) {
      updateFields.push('name = ?');
      params.push(updateData.name);
    }

    if (updateData.pin !== undefined) {
      updateFields.push('pin = ?');
      params.push(updateData.pin);
    }

    if (updateData.role !== undefined) {
      updateFields.push('role = ?');
      params.push(updateData.role);
    }


    updateFields.push('updatedAt = ?');
    params.push(new Date().toISOString());
    params.push(userId);

    const stmt = env.DB.prepare(`
      UPDATE users SET ${updateFields.join(', ')} WHERE id = ?
    `);

    await stmt.bind(...params).run();

    return new Response(JSON.stringify({
      success: true,
      message: 'User updated successfully'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error updating user',
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

export async function onRequestDelete(context) {
  try {
    const { env, request } = context;
    const url = new URL(request.url);
    const userId = url.pathname.split('/').pop();

    if (!userId || userId === 'users') {
      return new Response(JSON.stringify({
        error: 'User ID is required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Soft delete by setting isActive to false
    const stmt = env.DB.prepare('UPDATE users SET isActive = false, updatedAt = ? WHERE id = ?');
    await stmt.bind(new Date().toISOString(), userId).run();

    return new Response(JSON.stringify({
      success: true,
      message: 'User deleted successfully'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error deleting user',
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