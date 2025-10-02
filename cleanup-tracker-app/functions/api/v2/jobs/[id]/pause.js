export async function onRequestPost(context) {
  const { env, params } = context;
  const stmt = env.DB.prepare('UPDATE jobs SET status = ?, updatedAt = ? WHERE id = ?');
  await stmt.bind('Paused', new Date().toISOString(), params.id).run();
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
