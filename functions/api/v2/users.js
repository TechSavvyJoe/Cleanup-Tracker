import { ensureSchema, qAll, qGet, json, bad } from '../../_lib/db';

function autodetectD1(env) {
  if (env && env.DB) return env.DB;
  try {
    for (const [_, val] of Object.entries(env || {})) {
      if (val && typeof val.prepare === 'function' && typeof val.batch === 'function') return val;
    }
  } catch {}
  return null;
}

export async function onRequest(context) {
  try {
    const request = context && context.request ? context.request : null;
    const method = request ? request.method.toUpperCase() : 'GET';
    if (method === 'OPTIONS') {
      // basic CORS preflight
      return new Response(null, {
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
          'access-control-allow-headers': request && request.headers ? (request.headers.get('access-control-request-headers') || 'Content-Type') : 'Content-Type',
          'access-control-max-age': '86400'
        }
      });
    }

    if (method !== 'GET' && method !== 'POST' && method !== 'PUT' && method !== 'DELETE') {
      return bad('Method not allowed', 405);
    }

    const DB = autodetectD1(context && context.env ? context.env : {});
    if (!DB) return bad('D1 binding missing. Bind DB in Pages → Settings → Functions → D1 bindings.', 500);

    await ensureSchema(DB);

    if (method === 'GET') {
      const rows = await qAll(DB, 'SELECT * FROM users ORDER BY name');
      const out = rows.map(function(u){
        return { _id: u.id, name: u.name, pin: u.pin, role: u.role, uid: u.uid, username: u.username, password: u.password };
      });
      return json(out);
    }

    if (method === 'POST') {
      const body = await (request ? request.json() : Promise.resolve({}));
      if (!body || !body.name || !body.pin) return bad('name and pin required', 400);
      const exists = await qGet(DB, 'SELECT id FROM users WHERE pin = ?1', [String(body.pin)]);
      if (exists && exists.id) return bad('PIN already in use', 409);
      const now = new Date().toISOString();
      const id = (crypto && crypto.randomUUID) ? crypto.randomUUID() : now.replace(/\D/g,'') + Math.random().toString(16).slice(2);
      const uid = 'det-' + id.slice(0,8);
      await DB.prepare('INSERT INTO users (id,name,pin,role,uid,createdAt,updatedAt) VALUES (?1,?2,?3,?4,?5,?6,?6)')
        .bind(id, body.name, String(body.pin), body.role || 'detailer', uid, now)
        .run();
      return json({ _id: id, name: body.name, pin: String(body.pin), role: body.role || 'detailer', uid }, 201);
    }

    // Basic stubs for completeness
    if (method === 'PUT' || method === 'DELETE') {
      return bad('Use /api/v2/users/:id via wildcard route for updates/deletes for now', 405);
    }

    return bad('Not found', 404);
  } catch (e) {
    return bad('users error: ' + (e && e.message ? e.message : String(e)), 500);
  }
}
