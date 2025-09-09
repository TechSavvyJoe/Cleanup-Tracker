export async function onRequest(context) {
  return new Response(JSON.stringify({ 
    working: true,
    timestamp: Date.now(),
    path: "debug-endpoint",
    method: context.request.method
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}
