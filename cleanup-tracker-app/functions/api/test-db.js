// Simple test endpoint to check D1 connectivity
export async function onRequestGet(context) {
  try {
    const { env } = context;

    // Test simple query
    const stmt = env.DB.prepare('SELECT 1 as test');
    const result = await stmt.first();

    return new Response(JSON.stringify({
      success: true,
      result: result,
      message: 'Database connection successful'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });

  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error.message,
      stack: error.stack
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}