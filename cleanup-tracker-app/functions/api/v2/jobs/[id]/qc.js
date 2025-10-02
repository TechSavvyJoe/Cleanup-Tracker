export async function onRequestPost(context) {
  const { env, params, request } = context;
  const { passed, issues } = await request.json();
  const status = passed ? 'Completed' : 'QC Required';
  const now = new Date().toISOString();
  const stmt = env.DB.prepare('UPDATE jobs SET status = ?, qcIssues = ?, updatedAt = ? WHERE id = ?');
  await stmt.bind(status, issues || null, now, params.id).run();
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
