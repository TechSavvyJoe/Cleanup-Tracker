import { ensureSchema, qGet, qRun, json, bad } from '../../../_lib/db';

function autodetectD1(env) {
  if (env && env.DB) return env.DB;
  try { for (const k in (env || {})) { const v = env[k]; if (v && typeof v.prepare === 'function' && typeof v.batch === 'function') return v; } } catch {}
  return null;
}

export async function onRequest(context) {
  try {
    const request = context && context.request ? context.request : null;
    const method = request ? request.method.toUpperCase() : 'PUT';
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'PUT,OPTIONS',
        'access-control-allow-headers': request && request.headers ? (request.headers.get('access-control-request-headers') || 'Content-Type') : 'Content-Type',
        'access-control-max-age': '86400'
      }});
    }
    if (method !== 'PUT') return bad('Method not allowed', 405);

    const DB = autodetectD1(context && context.env ? context.env : {});
    if (!DB) return bad('D1 binding missing. Bind DB in Pages → Settings → Functions → D1 bindings.', 500);
    await ensureSchema(DB);

    const body = await (request ? request.json() : Promise.resolve({}));
    const vin = body && body.vin ? String(body.vin).toUpperCase().trim() : '';
    const userId = body && body.userId ? String(body.userId) : '';
    if (!vin || !userId) return bad('vin and userId required', 400);

    const job = await qGet(DB, 'SELECT id FROM jobs WHERE UPPER(vin) = ?1 AND status = ?2 ORDER BY startTime DESC LIMIT 1', [vin, 'In Progress']);
    if (!job || !job.id) return bad('No in-progress job found for VIN', 404);
    const nowIso = new Date().toISOString();
    await qRun(DB, 'INSERT OR IGNORE INTO job_technicians (jobId, userId, assignedAt) VALUES (?1,?2,?3)', [job.id, userId, nowIso]);
    const link = await qGet(DB, 'SELECT startedAt FROM job_technicians WHERE jobId = ?1 AND userId = ?2', [job.id, userId]);
    if (!link || !link.startedAt) {
      await qRun(DB, 'UPDATE job_technicians SET startedAt = ?1 WHERE jobId = ?2 AND userId = ?3', [nowIso, job.id, userId]);
      await qRun(DB, 'INSERT INTO job_events (id, jobId, type, payload, at, byUserId) VALUES (lower(hex(randomblob(16))), ?1, ?2, ?3, ?4, ?5)', [job.id, 'tech_joined', JSON.stringify({ userId, via: 'vin' }), nowIso, userId]);
    }
    return json({ jobId: job.id });
  } catch (e) {
    return bad('vehicles/join-by-vin error: ' + (e && e.message ? e.message : String(e)), 500);
  }
}
