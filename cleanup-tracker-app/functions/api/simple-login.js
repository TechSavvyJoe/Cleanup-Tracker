// Simple login endpoint without any database dependencies
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

    // Static user data - no database calls
    const users = {
      '0000': { id: 1, employeeId: '0000', name: 'Admin', pin: '0000', role: 'admin', employeeNumber: '0000' },
      '1234': { id: 2, employeeId: '1234', name: 'Test User', pin: '1234', role: 'technician', employeeNumber: '1234' },
      '0001': { id: 3, employeeId: '0001', name: 'Manager', pin: '0001', role: 'manager', employeeNumber: '0001' },
      '1709': { id: 4, employeeId: '1709', name: 'Brian', pin: '1709', role: 'detailer', employeeNumber: '1709' },
      '5555': { id: 5, employeeId: '5555', name: 'Test New User', pin: '5555', role: 'technician', employeeNumber: '5555' }
    };

    const user = users[employeeId];

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

    // Return user data in the format expected by the frontend
    return new Response(JSON.stringify({
      user: user
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Login failed',
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