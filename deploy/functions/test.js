export async function onRequest(context) {
  return new Response(JSON.stringify({ 
    ok: true,
    message: "Test function working",
    method: context.request.method,
    url: context.request.url
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}
