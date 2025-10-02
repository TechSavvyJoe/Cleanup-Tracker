export async function onRequestPost(context) {
  try {
    const { env, params, request } = context;
    const { technicianId } = await request.json();
    const userStmt = env.DB.prepare('SELECT name FROM users WHERE id = ?');
    const user = await userStmt.bind(technicianId).first();
    const stmt = env.DB.prepare('UPDATE jobs SET technicianId = ?, technicianName = ?, updatedAt = ? WHERE id = ?');
    await stmt.bind(technicianId, user?.name, new Date().toISOString(), params.id).run();
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to add technician', message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
