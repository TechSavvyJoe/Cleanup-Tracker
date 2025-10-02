// Reports endpoint for Cloudflare Workers with D1
export async function onRequestGet(context) {
  try {
    const { env } = context;

    // Get basic report data
    const [jobsQuery, vehiclesQuery, usersQuery] = await Promise.all([
      env.DB.prepare('SELECT status, COUNT(*) as count FROM jobs GROUP BY status').all(),
      env.DB.prepare('SELECT COUNT(*) as total FROM vehicles').first(),
      env.DB.prepare('SELECT COUNT(*) as total FROM users WHERE isActive = true').first()
    ]);

    // Calculate job statistics
    const jobStats = {};
    jobsQuery.results?.forEach(row => {
      jobStats[row.status] = row.count;
    });

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentJobsQuery = await env.DB.prepare(`
      SELECT DATE(createdAt) as date, COUNT(*) as count
      FROM jobs
      WHERE createdAt >= ?
      GROUP BY DATE(createdAt)
      ORDER BY date DESC
    `).bind(thirtyDaysAgo.toISOString()).all();

    const response = {
      summary: {
        totalJobs: Object.values(jobStats).reduce((sum, count) => sum + count, 0),
        completedJobs: jobStats['Completed'] || 0,
        pendingJobs: jobStats['Pending'] || 0,
        inProgressJobs: jobStats['In Progress'] || 0,
        totalVehicles: vehiclesQuery?.total || 0,
        totalUsers: usersQuery?.total || 0
      },
      jobsByStatus: jobStats,
      recentActivity: recentJobsQuery.results || []
    };

    return new Response(JSON.stringify(response), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Error generating reports',
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