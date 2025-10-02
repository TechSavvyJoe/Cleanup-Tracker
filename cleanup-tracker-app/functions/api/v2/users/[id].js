export async function onRequestGet(context) {
  try {
    const { env, params } = context;
    const stmt = env.DB.prepare('SELECT * FROM users WHERE id = ?');
    const user = await stmt.bind(params.id).first();
    if (user) delete user.pin;
    return new Response(JSON.stringify(user || {}), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch user', message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
export async function onRequestPut(context) {
  try {
    const { env, params, request } = context;
    const data = await request.json();
    const fields = [];
    const values = [];
    if (data.name) { fields.push('name = ?'); values.push(data.name); }
    if (data.role) { fields.push('role = ?'); values.push(data.role); }
    if (data.pin) { fields.push('pin = ?'); values.push(data.pin); }
    if (data.isActive !== undefined) { fields.push('isActive = ?'); values.push(data.isActive ? 1 : 0); }
    fields.push('updatedAt = ?');
    values.push(new Date().toISOString(), params.id);
    const stmt = env.DB.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`);
    await stmt.bind(...values).run();
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to update user', message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
export async function onRequestDelete(context) {
  try {
    const { env, params } = context;
    const stmt = env.DB.prepare('DELETE FROM users WHERE id = ?');
    await stmt.bind(params.id).run();
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to delete user', message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
