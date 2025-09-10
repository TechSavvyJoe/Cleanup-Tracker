import { ensureSchema, qAll, qGet, qRun, json, bad } from '../../_lib/db';

function autodetectD1(env) {
  if (env && env.DB) return env.DB;
  try {
    for (const [_, val] of Object.entries(env || {})) {
      if (val && typeof val.prepare === 'function' && typeof val.batch === 'function') return val;
    }
  } catch {}
  return null;
}

function newId() {
  try { if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID(); } catch {}
  const bytes = new Uint8Array(16);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) crypto.getRandomValues(bytes); else for (let i=0;i<16;i++) bytes[i]=Math.floor(Math.random()*256);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const h = Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}

function toJobDto(j, assignedIds, techTimers) {
  return {
    _id: j.id,
    technicianId: j.technicianId,
    technicianName: j.technicianName,
    assignedTechnicianIds: assignedIds || [],
    techTimers: techTimers || {},
    vin: j.vin,
    stockNumber: j.stockNumber,
    vehicleDescription: j.vehicleDescription,
    serviceType: j.serviceType,
    startTime: j.startTime,
    endTime: j.endTime,
    duration: j.duration,
    status: j.status,
    date: j.date,
    notes: j.notes,
    location: j.location,
    price: j.price
  };
}

export async function onRequest(context) {
  try {
    const request = context && context.request ? context.request : null;
    const method = request ? request.method.toUpperCase() : 'GET';
    if (method === 'OPTIONS') {
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

    const DB = autodetectD1(context && context.env ? context.env : {});
    if (!DB) return bad('D1 binding missing. Bind DB in Pages → Settings → Functions → D1 bindings.', 500);

    await ensureSchema(DB);

    if (method === 'GET') {
      const url = new URL(request.url);
      const urlParams = url.searchParams;
      let sql = 'SELECT * FROM jobs';
      const where = [];
      const paramsSql = [];

      if (urlParams.has('user') && urlParams.get('user')) {
        where.push('technicianId = ?');
        paramsSql.push(urlParams.get('user'));
      }
      if (urlParams.has('cleanupType') && urlParams.get('cleanupType')) {
        where.push('serviceType = ?');
        paramsSql.push(urlParams.get('cleanupType'));
      }
      if (urlParams.has('startDate') && urlParams.get('startDate')) {
        where.push('date >= ?');
        paramsSql.push(urlParams.get('startDate'));
      }
      if (urlParams.has('endDate') && urlParams.get('endDate')) {
        where.push('date <= ?');
        paramsSql.push(urlParams.get('endDate'));
      }

      if (where.length > 0) sql += ' WHERE ' + where.join(' AND ');
      sql += ' ORDER BY startTime DESC';

      const rows = await qAll(DB, sql, paramsSql);
      const links = await qAll(DB, 'SELECT jobId, userId, startedAt, endedAt, duration FROM job_technicians');
      const byJob = {};
      for (let i = 0; i < links.length; i++) {
        const r = links[i];
        if (!byJob[r.jobId]) byJob[r.jobId] = { ids: [], timers: {} };
        byJob[r.jobId].ids.push(r.userId);
        byJob[r.jobId].timers[r.userId] = { startedAt: r.startedAt || null, endedAt: r.endedAt || null, duration: (r.duration == null ? null : r.duration) };
      }
      const out = rows.map(function(r){ var bj = byJob[r.id] || {}; return toJobDto(r, bj.ids || [], bj.timers || {}); });
      return json(out);
    }

    if (method === 'POST') {
      const body = await (request ? request.json() : Promise.resolve({}));
      const now = new Date();
      const id = newId();
      const date = (body && body.date) ? body.date : now.toISOString().split('T')[0];
      await qRun(DB, 'INSERT INTO jobs (id,technicianId,technicianName,vin,stockNumber,vehicleDescription,serviceType,startTime,endTime,duration,status,date,notes,location,price,createdAt,updatedAt) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,NULL,NULL,?9,?10,?11,?12,?13,?14,?14)', [
        id,
        body && body.technicianId ? body.technicianId : null,
        body && body.technicianName ? body.technicianName : null,
        body && body.vin ? body.vin : null,
        body && body.stockNumber ? body.stockNumber : null,
        body && body.vehicleDescription ? body.vehicleDescription : null,
        body && body.serviceType ? body.serviceType : null,
        now.toISOString(),
        'In Progress',
        date,
        body && body.notes ? body.notes : null,
        body && body.location ? body.location : null,
        body && body.price != null ? body.price : null,
        now.toISOString()
      ]);

      // record technician assignments
      const arr = [];
      if (body && body.technicianId) arr.push(body.technicianId);
      if (body && Array.isArray(body.coTechnicianIds)) {
        for (let i=0;i<body.coTechnicianIds.length;i++) {
          const v = body.coTechnicianIds[i];
          if (v && arr.indexOf(v) === -1) arr.push(v);
        }
      }
      for (let i=0;i<arr.length;i++) {
        const t = arr[i];
        const startedAt = (t === (body && body.technicianId ? body.technicianId : null)) ? now.toISOString() : null;
        await qRun(DB, 'INSERT OR IGNORE INTO job_technicians (jobId, userId, assignedAt, startedAt) VALUES (?1,?2,?3,?4)', [id, t, now.toISOString(), startedAt]);
      }

      // job event
      await qRun(DB, 'INSERT INTO job_events (id, jobId, type, payload, at, byUserId) VALUES (?1,?2,?3,?4,?5,?6)', [newId(), id, 'job_started', JSON.stringify(body || {}), now.toISOString(), body && body.technicianId ? body.technicianId : null]);
      return json({ _id: id }, 201);
    }

    return bad('Method not allowed', 405);
  } catch (e) {
    return bad('jobs error: ' + (e && e.message ? e.message : String(e)), 500);
  }
}
