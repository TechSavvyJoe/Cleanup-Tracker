// Temporary workaround login endpoint - bypasses D1 issue
export async function onRequestPost(context) {
  try {
    const { request } = context;
    const { employeeId } = await request.json();

    if (!employeeId) {
      return new Response(JSON.stringify({
        error: 'employeeId required'
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Temporary user database (hardcoded) - replace with D1 when issue is resolved
    const tempUsers = {
      '0000': { id: 1, employeeId: '0000', name: 'Admin', pin: '0000', role: 'admin' },
      '1234': { id: 2, employeeId: '1234', name: 'Test User', pin: '1234', role: 'technician' },
      '0001': { id: 3, employeeId: '0001', name: 'Manager', pin: '0001', role: 'manager' },
      '1709': { id: 4, employeeId: '1709', name: 'Brian', pin: '1709', role: 'detailer' }
    };

    const user = tempUsers[employeeId];

    if (!user) {
      return new Response(JSON.stringify({
        error: 'User not found'
      }), {
        status: 404,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // Return user data (matches original backend format)
    const userData = {
      id: user.id,
      name: user.name,
      role: user.role,
      pin: user.pin,
      employeeNumber: user.employeeId
    };

    return new Response(JSON.stringify({
      user: userData
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