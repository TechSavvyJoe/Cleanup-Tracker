export async function onRequestPut(context) {
  try {
    const { env, params } = context;
    const stmt = env.DB.prepare('UPDATE jobs SET status = ?, updatedAt = ? WHERE id = ?');
    await stmt.bind('Paused', new Date().toISOString(), params.id).run();
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to stop job', message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'PUT, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
