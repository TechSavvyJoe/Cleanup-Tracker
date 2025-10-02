export async function onRequestPut(context) {
  const { env, params, request } = context;
  const { duration, notes } = await request.json();
  const now = new Date().toISOString();
  const stmt = env.DB.prepare('UPDATE jobs SET status = ?, completedAt = ?, actualDuration = ?, notes = ?, updatedAt = ? WHERE id = ?');
  await stmt.bind('Completed', now, duration || null, notes || null, now, params.id).run();
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'PUT, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
