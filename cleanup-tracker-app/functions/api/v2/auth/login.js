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
      '1701': { id: 1, employeeId: '1701', name: 'Joe Gallant', pin: '1701', role: 'manager' },
      '1716': { id: 2, employeeId: '1716', name: 'Alfred', pin: '1716', role: 'detailer' },
      '1709': { id: 3, employeeId: '1709', name: 'Brian', pin: '1709', role: 'detailer' },
      '2001': { id: 4, employeeId: '2001', name: 'Samantha', pin: '2001', role: 'sales' },
      '2002': { id: 5, employeeId: '2002', name: 'David', pin: '2002', role: 'sales' },
      '2003': { id: 6, employeeId: '2003', name: 'Rachel', pin: '2003', role: 'sales' }
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

    // Provide tokens to match frontend expectations
    const tokens = {
      accessToken: 'fallback-access-token',
      refreshToken: 'fallback-refresh-token',
      accessTokenExpiresIn: '15m',
      refreshTokenExpiresIn: '7d'
    };

    return new Response(JSON.stringify({
      user: userData,
      tokens
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