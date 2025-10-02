export async function onRequestPost(context) {
  try {
    const { env, params, request } = context;
    const { message, userName } = await request.json();
    const getStmt = env.DB.prepare('SELECT notes FROM jobs WHERE id = ?');
    const job = await getStmt.bind(params.id).first();
    const timestamp = new Date().toISOString();
    const newNote = `[${timestamp}] ${userName || 'User'}: ${message}`;
    const updatedNotes = job?.notes ? `${job.notes}\n${newNote}` : newNote;
    const updateStmt = env.DB.prepare('UPDATE jobs SET notes = ?, updatedAt = ? WHERE id = ?');
    await updateStmt.bind(updatedNotes, timestamp, params.id).run();
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to add message', message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
