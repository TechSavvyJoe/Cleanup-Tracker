import { ensureSchema, qAll, qGet, qRun, json, bad, created, ok } from '../../_lib/db';

function autodetectD1(env) {
  if (env.DB) return env.DB;
  for (const [key, val] of Object.entries(env)) {
    if (val && typeof val.prepare === 'function' && typeof val.batch === 'function') return val;
  }
  return null;
}

function detectD1BindingName(env) {
  if (env.DB) return 'DB';
  for (const [key, val] of Object.entries(env)) {
    if (val && typeof val.prepare === 'function' && typeof val.batch === 'function') return key;
  }
  return null;
}

function newId() {
  try { if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID(); } catch {}
  const bytes = new Uint8Array(16);
  (typeof crypto !== 'undefined' && crypto.getRandomValues) ? crypto.getRandomValues(bytes) : (() => { for (let i=0;i<16;i++) bytes[i]=Math.floor(Math.random()*256); })();
  bytes[6] = (bytes[6] & 0x0f) | 0x40; bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const h = [...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');
  return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;
}

export async function onRequest(context) {
  const { request, env, params } = context;
  if (request.method.toUpperCase() === 'OPTIONS') {
    return new Response(null, { status: 204, headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'access-control-allow-headers': 'Content-Type'
    }});
  }
  const DB = autodetectD1(env);
  if (!DB) return bad('D1 binding missing. Bind your DB as "DB".', 500);

  const url = new URL(request.url);
  const path = (params.path || '').split('/').filter(Boolean);
  const [segment, id, sub] = path;
  const method = request.method.toUpperCase();

  try {
    // diag
    if (segment === 'diag' && method === 'GET') {
      let users = 0, jobs = 0, vehicles = 0;
      try { users = (await qGet(DB, 'SELECT COUNT(1) c FROM users'))?.c ?? 0; } catch {}
      try { jobs = (await qGet(DB, 'SELECT COUNT(1) c FROM jobs'))?.c ?? 0; } catch {}
      try { vehicles = (await qGet(DB, 'SELECT COUNT(1) c FROM vehicles'))?.c ?? 0; } catch {}
      const bindingName = detectD1BindingName(env);
      return json({ dbBound: true, bindingName, users, jobs, vehicles });
    }

    // init
    if (segment === 'init' && (method === 'GET' || method === 'POST')) {
      await ensureSchema(DB);
      // seed users if empty
      const uc = await qGet(DB, 'SELECT COUNT(1) c FROM users');
      if ((uc?.c ?? 0) === 0) {
        const now = new Date().toISOString();
        const defaults = [
          { id: newId(), name: 'Manager', pin: null, role: 'manager', uid: 'mgr-1', username: 'manager', password: '1234' },
          { id: newId(), name: 'Alice Detail', pin: '1111', role: 'detailer', uid: 'det-1', username: null, password: null },
          { id: newId(), name: 'Bob Detail', pin: '2222', role: 'detailer', uid: 'det-2', username: null, password: null },
        ];
        const stmts = defaults.map(u => DB.prepare('INSERT INTO users (id,name,pin,role,uid,username,password,createdAt,updatedAt) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?8)')
          .bind(u.id, u.name, u.pin, u.role, u.uid, u.username, u.password, now));
        await DB.batch(stmts);
      }
      const stats = {
        users: (await qGet(DB, 'SELECT COUNT(1) c FROM users'))?.c ?? 0,
        jobs: (await qGet(DB, 'SELECT COUNT(1) c FROM jobs'))?.c ?? 0,
        vehicles: (await qGet(DB, 'SELECT COUNT(1) c FROM vehicles'))?.c ?? 0,
      };
      return json({ ok: true, initialized: true, ...stats });
    }

    // users
    if (segment === 'users') {
      if (method === 'GET') {
        try {
          const rows = await qAll(DB, 'SELECT * FROM users ORDER BY name');
          return json(rows.map(u => ({ _id: u.id, name: u.name, pin: u.pin, role: u.role, uid: u.uid, username: u.username, password: u.password })));
        } catch (e) {
          if ((e?.message || '').includes('no such table')) { await ensureSchema(DB); const rows = await qAll(DB, 'SELECT * FROM users ORDER BY name'); return json(rows.map(u => ({ _id: u.id, name: u.name, pin: u.pin, role: u.role, uid: u.uid, username: u.username, password: u.password }))); }
          throw e;
        }
      }
      if (method === 'POST') {
        const body = await request.json();
        if (!body?.name || !body?.pin) return bad('name and pin required', 400);
        const existing = await qGet(DB, 'SELECT id FROM users WHERE pin = ?1', [String(body.pin)]);
        if (existing) return bad('PIN already in use', 409);
        const idv = newId();
        const uid = `det-${idv.slice(0,8)}`;
        await qRun(DB, 'INSERT INTO users (id,name,pin,role,uid,createdAt,updatedAt) VALUES (?1,?2,?3,?4,?5,?6,?6)', [idv, body.name, String(body.pin), 'detailer', uid, new Date().toISOString()]);
        return created({ _id: idv, name: body.name, pin: String(body.pin), role: 'detailer', uid });
      }
      if (id && method === 'PUT') {
        const body = await request.json();
        if (!body?.name || !body?.pin) return bad('name and pin required', 400);
        const other = await qGet(DB, 'SELECT id FROM users WHERE pin = ?1 AND id <> ?2', [String(body.pin), id]);
        if (other) return bad('PIN already in use', 409);
        await qRun(DB, 'UPDATE users SET name = ?1, pin = ?2, updatedAt = ?3 WHERE id = ?4', [body.name, String(body.pin), new Date().toISOString(), id]);
        return ok();
      }
      if (id && method === 'DELETE') {
        await qRun(DB, 'DELETE FROM users WHERE id = ?1', [id]);
        return ok();
      }
    }

    // jobs
    if (segment === 'jobs') {
      if (method === 'GET') {
        try {
          const rows = await qAll(DB, 'SELECT * FROM jobs ORDER BY startTime DESC');
          const links = await qAll(DB, 'SELECT jobId, userId, startedAt, endedAt, duration FROM job_technicians');
          const byJob = links.reduce((m, r) => { (m[r.jobId] ||= { ids: [], timers: {} }); m[r.jobId].ids.push(r.userId); m[r.jobId].timers[r.userId] = { startedAt: r.startedAt || null, endedAt: r.endedAt || null, duration: r.duration ?? null }; return m; }, {});
          return json(rows.map(r => toJobDto(r, byJob[r.id]?.ids || [], byJob[r.id]?.timers || {})));
        } catch (err) {
          if ((err?.message || '').includes('no such table')) { await ensureSchema(DB); const rows = await qAll(DB, 'SELECT * FROM jobs ORDER BY startTime DESC'); const links = await qAll(DB, 'SELECT jobId, userId, startedAt, endedAt, duration FROM job_technicians'); const byJob = links.reduce((m, r) => { (m[r.jobId] ||= { ids: [], timers: {} }); m[r.jobId].ids.push(r.userId); m[r.jobId].timers[r.userId] = { startedAt: r.startedAt || null, endedAt: r.endedAt || null, duration: r.duration ?? null }; return m; }, {}); return json(rows.map(r => toJobDto(r, byJob[r.id]?.ids || [], byJob[r.id]?.timers || {}))); }
          console.error(`Error fetching jobs: ${err.message}`);
          return json([]);
        }
      }
      if (method === 'POST') {
        const body = await request.json();
        const now = new Date();
        const idv = newId();
        const date = (body?.date) || now.toISOString().split('T')[0];
        await qRun(DB, `INSERT INTO jobs (id,technicianId,technicianName,vin,stockNumber,vehicleDescription,serviceType,startTime,endTime,duration,status,date,notes,location,price,createdAt,updatedAt)
          VALUES (?1,?2,?3,?4,?5,?6,?7,?8,NULL,NULL,'In Progress',?9,?10,?11,?12,?13,?13)`, [
          idv, body.technicianId, body.technicianName, body.vin, body.stockNumber, body.vehicleDescription, body.serviceType, now.toISOString(), date,
          body.notes || null, body.location || null, body.price ?? null, now.toISOString()
        ]);
        const techs = [body.technicianId, ...(Array.isArray(body.coTechnicianIds) ? body.coTechnicianIds : [])].filter(Boolean).filter((v,i,a)=>a.indexOf(v)===i);
        for (const t of techs) {
          const isPrimary = t === body.technicianId;
          const startedAt = isPrimary ? now.toISOString() : null;
          await qRun(DB, 'INSERT OR IGNORE INTO job_technicians (jobId, userId, assignedAt, startedAt) VALUES (?1,?2,?3,?4)', [idv, t, now.toISOString(), startedAt]);
        }
        await qRun(DB, `INSERT INTO job_events (id, jobId, type, payload, at, byUserId) VALUES (?1,?2,?3,?4,?5,?6)`, [newId(), idv, 'job_started', JSON.stringify(body || {}), now.toISOString(), body.technicianId || null]);
        return created({ _id: idv });
      }
      if (id && sub === 'complete' && method === 'PUT') {
        const job = await qGet(DB, 'SELECT startTime FROM jobs WHERE id = ?1', [id]);
        if (!job?.startTime) return bad('job not found', 404);
        const end = new Date();
        const duration = end - new Date(job.startTime);
        await qRun(DB, 'UPDATE jobs SET endTime = ?1, duration = ?2, status = ?3, updatedAt = ?4 WHERE id = ?5', [end.toISOString(), duration, 'Completed', end.toISOString(), id]);
        await qRun(DB, `INSERT INTO job_events (id, jobId, type, payload, at) VALUES (?1,?2,?3,?4,?5)`, [newId(), id, 'job_completed', JSON.stringify({ duration }), end.toISOString()]);
        return ok();
      }
    }

    // job join/stop
    if (segment === 'jobs' && id && sub === 'join' && method === 'PUT') {
      const body = await request.json().catch(() => ({}));
      const userId = body?.userId; if (!userId) return bad('userId required', 400);
      const now = new Date().toISOString();
      await qRun(DB, 'INSERT OR IGNORE INTO job_technicians (jobId, userId, assignedAt) VALUES (?1,?2,?3)', [id, userId, now]);
      const link = await qGet(DB, 'SELECT startedAt FROM job_technicians WHERE jobId = ?1 AND userId = ?2', [id, userId]);
      if (!link?.startedAt) {
        await qRun(DB, 'UPDATE job_technicians SET startedAt = ?1 WHERE jobId = ?2 AND userId = ?3', [now, id, userId]);
        await qRun(DB, `INSERT INTO job_events (id, jobId, type, payload, at, byUserId) VALUES (?1,?2,?3,?4,?5,?6)`, [newId(), id, 'tech_joined', JSON.stringify({ userId }), now, userId]);
      }
      return ok();
    }
    if (segment === 'jobs' && id && sub === 'stop' && method === 'PUT') {
      const body = await request.json().catch(() => ({}));
      const userId = body?.userId; if (!userId) return bad('userId required', 400);
      const link = await qGet(DB, 'SELECT startedAt, endedAt FROM job_technicians WHERE jobId = ?1 AND userId = ?2', [id, userId]);
      if (!link?.startedAt) return bad('timer not started for this tech', 409);
      if (link.endedAt) return ok();
      const now = new Date();
      const duration = now - new Date(link.startedAt);
      await qRun(DB, 'UPDATE job_technicians SET endedAt = ?1, duration = ?2 WHERE jobId = ?3 AND userId = ?4', [now.toISOString(), duration, id, userId]);
      await qRun(DB, `INSERT INTO job_events (id, jobId, type, payload, at, byUserId) VALUES (?1,?2,?3,?4,?5,?6)`, [newId(), id, 'tech_stopped', JSON.stringify({ userId, duration }), now.toISOString(), userId]);
      return ok();
    }

    // vehicles search minimal (CSV ingestion via server for now)
    if (segment === 'vehicles' && path[1] === 'search' && method === 'GET') {
      const q = (new URL(request.url)).searchParams.get('q')?.toUpperCase()?.trim() || '';
      if (!q) return json([]);
      const rows = await qAll(DB, 'SELECT * FROM vehicles WHERE UPPER(vin) LIKE ?1 OR UPPER(stockNumber) LIKE ?1 LIMIT 20', [`%${q}%`]);
      return json(rows.map(v => ({ ...v, vehicleDescription: v.vehicleDescription || [v.year, v.make, v.model].filter(Boolean).join(' ').trim() })));
    }

    return bad('Not found', 404);
  } catch (e) {
    console.error(`Unhandled error on ${method} ${url.pathname}:`, e);
    return bad(`Error: ${e.message || e}`, 500);
  }
}

function toJobDto(j, assignedIds = [], techTimers = {}) {
  return {
    _id: j.id,
    technicianId: j.technicianId,
    technicianName: j.technicianName,
    assignedTechnicianIds: assignedIds,
    techTimers,
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
    price: j.price,
  };
}
