export async function onRequestPost(context) {
  try {
    const { env, params, request } = context;
    const { passed, issues } = await request.json();
    const status = passed ? 'Completed' : 'QC Required';
    const stmt = env.DB.prepare('UPDATE jobs SET status = ?, qcIssues = ?, updatedAt = ? WHERE id = ?');
    await stmt.bind(status, issues || null, new Date().toISOString(), params.id).run();
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to update QC status', message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
