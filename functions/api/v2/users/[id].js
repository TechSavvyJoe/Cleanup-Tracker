import { ensureSchema, qGet, qRun, json, bad } from '../../../_lib/db';

function autodetectD1(env) {
  if (env && env.DB) return env.DB;
  try {
    for (const k in (env || {})) {
      const v = env[k];
      if (v && typeof v.prepare === 'function' && typeof v.batch === 'function') return v;
    }
  } catch {}
  return null;
}

export async function onRequest(context) {
  try {
    const request = context && context.request ? context.request : null;
    const method = request ? request.method.toUpperCase() : 'GET';
    const params = context && context.params ? context.params : {};
    const id = params && params.id ? params.id : null;

    if (!id) return bad('id is required', 400);
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
        'access-control-allow-headers': request && request.headers ? (request.headers.get('access-control-request-headers') || 'Content-Type') : 'Content-Type',
        'access-control-max-age': '86400'
      }});
    }

    const DB = autodetectD1(context && context.env ? context.env : {});
    if (!DB) return bad('D1 binding missing. Bind DB in Pages → Settings → Functions → D1 bindings.', 500);
    await ensureSchema(DB);

    if (method === 'PUT') {
      const body = await (request ? request.json() : Promise.resolve({}));
      if (!body || !body.name || !body.pin) return bad('name and pin required', 400);
      const other = await qGet(DB, 'SELECT id FROM users WHERE pin = ?1 AND id <> ?2', [String(body.pin), id]);
      if (other && other.id) return bad('PIN already in use', 409);
      await qRun(DB, 'UPDATE users SET name = ?1, pin = ?2, updatedAt = ?3 WHERE id = ?4', [body.name, String(body.pin), new Date().toISOString(), id]);
      return json({ ok: true });
    }

    if (method === 'DELETE') {
      await qRun(DB, 'DELETE FROM users WHERE id = ?1', [id]);
      return new Response(null, { status: 204, headers: { 'access-control-allow-origin': '*' } });
    }

    return bad('Method not allowed', 405);
  } catch (e) {
    return bad('users/:id error: ' + (e && e.message ? e.message : String(e)), 500);
  }
}
