// Diagnostic endpoint for system health check
export async function onRequestGet(context) {
  try {
    const { env } = context;

    // Check database connection
    let dbConnected = false;
    let userCount = 0;
    let jobCount = 0;
    let vehicleCount = 0;

    try {
      const userStmt = env.DB.prepare('SELECT COUNT(*) as count FROM users');
      const userResult = await userStmt.first();
      userCount = userResult?.count || 0;

      const jobStmt = env.DB.prepare('SELECT COUNT(*) as count FROM jobs');
      const jobResult = await jobStmt.first();
      jobCount = jobResult?.count || 0;

      const vehicleStmt = env.DB.prepare('SELECT COUNT(*) as count FROM vehicles');
      const vehicleResult = await vehicleStmt.first();
      vehicleCount = vehicleResult?.count || 0;

      dbConnected = true;
    } catch (error) {
      console.error('Database connection error:', error);
    }

    return new Response(JSON.stringify({
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: {
        connected: dbConnected,
        users: userCount,
        jobs: jobCount,
        vehicles: vehicleCount
      },
      version: '2.0'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      status: 'ERROR',
      message: error.message,
      timestamp: new Date().toISOString()
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
