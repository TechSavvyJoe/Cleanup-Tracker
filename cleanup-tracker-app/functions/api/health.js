// Health check endpoint for Cloudflare Workers
export async function onRequest(context) {
  return new Response(JSON.stringify({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: 'production',
    platform: 'Cloudflare Workers'
  }), {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}