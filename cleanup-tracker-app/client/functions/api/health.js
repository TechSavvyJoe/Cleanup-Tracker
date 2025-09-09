export function onRequest() {
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'access-control-allow-origin': '*', 'vary': 'Origin' }
  });
}
