export async function onRequestPut(context) {
  const { env, params } = context;
  const stmt = env.DB.prepare('UPDATE jobs SET status = ?, startedAt = ?, updatedAt = ? WHERE id = ?');
  const now = new Date().toISOString();
  await stmt.bind('In Progress', now, now, params.id).run();
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'PUT, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
