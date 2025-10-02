// User login endpoint for Cloudflare Workers with D1
export async function onRequestPost(context) {
  try {
    const { request, env } = context;
    const { employeeId, pin } = await request.json();

    if (!employeeId || !pin) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Employee ID and PIN are required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Query user from D1 database
    const stmt = env.DB.prepare('SELECT * FROM users WHERE employeeId = ? AND isActive = true');
    const user = await stmt.bind(employeeId).first();

    if (!user) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Invalid employee ID'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Simple PIN verification (in production, use bcrypt)
    if (user.pin !== pin) {
      return new Response(JSON.stringify({
        success: false,
        message: 'Invalid PIN'
      }), {
        status: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Return user data (without PIN)
    const userData = {
      id: user.id,
      employeeId: user.employeeId,
      name: user.name,
      role: user.role
    };

    return new Response(JSON.stringify({
      success: true,
      user: userData,
      message: 'Login successful'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      message: 'Server error during login',
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
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}