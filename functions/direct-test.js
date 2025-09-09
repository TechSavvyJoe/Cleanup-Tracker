export async function onRequest(context) {
  return new Response(JSON.stringify({ 
    ok: true,
    message: "Direct test function working",
    method: context.request.method,
    url: context.request.url,
    timestamp: new Date().toISOString()
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
// Force redeploy Tue Sep  9 18:19:05 EDT 2025
