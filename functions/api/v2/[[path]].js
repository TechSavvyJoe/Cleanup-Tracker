import { ensureSchema, qAll, qGet, qRun, json, bad, created, ok, corsHeaders } from '../../_lib/db';
import { parseCsv } from '../../_lib/csv';

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

async function seedDefaultUsers(DB) {
  const uc = await qGet(DB, 'SELECT COUNT(1) c FROM users');
  if ((uc?.c ?? 0) > 0) return { seeded: false, count: uc.c };
  const now = new Date().toISOString();
  const defaults = [
    { id: newId(), name: 'Manager', pin: null, role: 'manager', uid: 'mgr-1', username: 'manager', password: '1234' },
    { id: newId(), name: 'Alice Detail', pin: '1111', role: 'detailer', uid: 'det-1', username: null, password: null },
    { id: newId(), name: 'Bob Detail', pin: '2222', role: 'detailer', uid: 'det-2', username: null, password: null },
  ];
  const statements = defaults.map(u => DB.prepare(
    'INSERT INTO users (id,name,pin,role,uid,username,password,createdAt,updatedAt) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?8)'
  ).bind(u.id, u.name, u.pin, u.role, u.uid, u.username, u.password, now));
  await DB.batch(statements);
  const finalCount = await qGet(DB, 'SELECT COUNT(1) c FROM users');
  return { seeded: true, count: finalCount?.c ?? defaults.length };
}

export async function onRequest(context) {
  const { request, env, params } = context;
  // CORS preflight
  if (request.method.toUpperCase() === 'OPTIONS') {
    const reqHeaders = request.headers.get('access-control-request-headers') || 'Content-Type';
    const headers = { ...corsHeaders };
    delete headers['Content-Type'];
    headers['access-control-allow-methods'] = 'GET,POST,PUT,DELETE,OPTIONS';
    headers['access-control-allow-headers'] = reqHeaders;
    headers['access-control-max-age'] = '86400';
    return new Response(null, { status: 204, headers });
  }

  const url = new URL(request.url);
  const path = (params.path || '').split('/').filter(Boolean);
  const [segment, id, sub] = path; // e.g., jobs/:id/complete
  const method = request.method.toUpperCase();

  try {
    // Diagnostics
    if (segment === 'diag' && method === 'GET') {
      const maybeDB = autodetectD1(env);
      const bindingName = detectD1BindingName(env);
      if (!maybeDB) {
        return json({ dbBound: false, bindingName: bindingName || null, users: 0, jobs: 0, vehicles: 0 });
      }
      let users = 0, jobs = 0, vehicles = 0;
      try { users = (await qGet(maybeDB, 'SELECT COUNT(1) c FROM users'))?.c ?? 0; } catch {}
      try { jobs = (await qGet(maybeDB, 'SELECT COUNT(1) c FROM jobs'))?.c ?? 0; } catch {}
      try { vehicles = (await qGet(maybeDB, 'SELECT COUNT(1) c FROM vehicles'))?.c ?? 0; } catch {}
      return json({ dbBound: true, bindingName, users, jobs, vehicles });
    }

    const DB = autodetectD1(env);
    if (!DB) return bad('D1 binding missing. In Cloudflare Pages → Settings → Functions → D1 bindings, bind your database with the binding name DB.', 500);

    // Init endpoint: ensure schema and seed default users
    if (segment === 'init' && (method === 'GET' || method === 'POST')) {
      await ensureSchema(DB);
      await seedDefaultUsers(DB);
      const stats = {
        users: (await qGet(DB, 'SELECT COUNT(1) c FROM users'))?.c ?? 0,
        jobs: (await qGet(DB, 'SELECT COUNT(1) c FROM jobs'))?.c ?? 0,
        vehicles: (await qGet(DB, 'SELECT COUNT(1) c FROM vehicles'))?.c ?? 0,
      };
      return json({ ok: true, initialized: true, ...stats });
    }

    // Users
    if (segment === 'users') {
      if (method === 'GET') {
        try {
          const rows = await qAll(DB, 'SELECT * FROM users ORDER BY name');
          return json(rows.map(u => ({ _id: u.id, name: u.name, pin: u.pin, role: u.role, uid: u.uid, username: u.username, password: u.password })));
        } catch (e) {
          if ((e?.message || '').includes('no such table')) {
            await ensureSchema(DB);
            const rows = await qAll(DB, 'SELECT * FROM users ORDER BY name');
            return json(rows.map(u => ({ _id: u.id, name: u.name, pin: u.pin, role: u.role, uid: u.uid, username: u.username, password: u.password })));
          }
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

    // Jobs
    if (segment === 'jobs') {
      if (method === 'GET') {
        try {
          const rows = await qAll(DB, 'SELECT * FROM jobs ORDER BY startTime DESC');
          const links = await qAll(DB, 'SELECT jobId, userId, startedAt, endedAt, duration FROM job_technicians');
          const byJob = links.reduce((m, r) => { (m[r.jobId] ||= { ids: [], timers: {} }); m[r.jobId].ids.push(r.userId); m[r.jobId].timers[r.userId] = { startedAt: r.startedAt || null, endedAt: r.endedAt || null, duration: r.duration ?? null }; return m; }, {});
          return json(rows.map(r => toJobDto(r, byJob[r.id]?.ids || [], byJob[r.id]?.timers || {})));
        } catch (err) {
          if ((err?.message || '').includes('no such table')) {
            await ensureSchema(DB);
            const rows = await qAll(DB, 'SELECT * FROM jobs ORDER BY startTime DESC');
            const links = await qAll(DB, 'SELECT jobId, userId, startedAt, endedAt, duration FROM job_technicians');
            const byJob = links.reduce((m, r) => { (m[r.jobId] ||= { ids: [], timers: {} }); m[r.jobId].ids.push(r.userId); m[r.jobId].timers[r.userId] = { startedAt: r.startedAt || null, endedAt: r.endedAt || null, duration: r.duration ?? null }; return m; }, {});
            return json(rows.map(r => toJobDto(r, byJob[r.id]?.ids || [], byJob[r.id]?.timers || {})));
          }
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
        // record technician assignments (primary + optional co-techs)
        const techs = [body.technicianId, ...(Array.isArray(body.coTechnicianIds) ? body.coTechnicianIds : [])]
          .filter(Boolean).filter((v, i, a) => a.indexOf(v) === i);
        for (const t of techs) {
          const isPrimary = t === body.technicianId;
          const startedAt = isPrimary ? now.toISOString() : null;
          await qRun(DB, 'INSERT OR IGNORE INTO job_technicians (jobId, userId, assignedAt, startedAt) VALUES (?1,?2,?3,?4)', [idv, t, now.toISOString(), startedAt]);
        }
        // job event
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

    // Technician join/stop endpoints
    if (segment === 'jobs' && id && sub === 'join' && method === 'PUT') {
      const body = await request.json().catch(() => ({}));
      const userId = body?.userId; if (!userId) return bad('userId required', 400);
      const nowIso = new Date().toISOString();
      // ensure assignment exists, then start timer
      await qRun(DB, 'INSERT OR IGNORE INTO job_technicians (jobId, userId, assignedAt) VALUES (?1,?2,?3)', [id, userId, nowIso]);
      const link = await qGet(DB, 'SELECT startedAt FROM job_technicians WHERE jobId = ?1 AND userId = ?2', [id, userId]);
      if (!link?.startedAt) {
        await qRun(DB, 'UPDATE job_technicians SET startedAt = ?1 WHERE jobId = ?2 AND userId = ?3', [nowIso, id, userId]);
        await qRun(DB, `INSERT INTO job_events (id, jobId, type, payload, at, byUserId) VALUES (?1,?2,?3,?4,?5,?6)`, [newId(), id, 'tech_joined', JSON.stringify({ userId }), nowIso, userId]);
      }
      return ok();
    }
    if (segment === 'jobs' && id && sub === 'stop' && method === 'PUT') {
      const body = await request.json().catch(() => ({}));
      const userId = body?.userId; if (!userId) return bad('userId required', 400);
      const link = await qGet(DB, 'SELECT startedAt, endedAt FROM job_technicians WHERE jobId = ?1 AND userId = ?2', [id, userId]);
      if (!link?.startedAt) return bad('timer not started for this tech', 409);
      if (link.endedAt) return ok(); // Already stopped
      const now = new Date();
      const duration = now - new Date(link.startedAt);
      await qRun(DB, 'UPDATE job_technicians SET endedAt = ?1, duration = ?2 WHERE jobId = ?3 AND userId = ?4', [now.toISOString(), duration, id, userId]);
      await qRun(DB, `INSERT INTO job_events (id, jobId, type, payload, at, byUserId) VALUES (?1,?2,?3,?4,?5,?6)`, [newId(), id, 'tech_stopped', JSON.stringify({ userId, duration }), now.toISOString(), userId]);
      return ok();
    }

    // Join by VIN helper: find latest in-progress job by VIN and join
    if (segment === 'vehicles' && path[1] === 'join-by-vin' && method === 'PUT') {
      const body = await request.json().catch(() => ({}));
      const { vin, userId } = body || {};
      if (!vin || !userId) return bad('vin and userId required', 400);
      const job = await qGet(DB, 'SELECT id FROM jobs WHERE UPPER(vin) = ?1 AND status = ?2 ORDER BY startTime DESC LIMIT 1', [vin.toUpperCase(), 'In Progress']);
      if (!job?.id) return bad('No in-progress job found for VIN', 404);
      const nowIso = new Date().toISOString();
      await qRun(DB, 'INSERT OR IGNORE INTO job_technicians (jobId, userId, assignedAt) VALUES (?1,?2,?3)', [job.id, userId, nowIso]);
      const link = await qGet(DB, 'SELECT startedAt FROM job_technicians WHERE jobId = ?1 AND userId = ?2', [job.id, userId]);
      if (!link?.startedAt) {
        await qRun(DB, 'UPDATE job_technicians SET startedAt = ?1 WHERE jobId = ?2 AND userId = ?3', [nowIso, job.id, userId]);
        await qRun(DB, `INSERT INTO job_events (id, jobId, type, payload, at, byUserId) VALUES (?1,?2,?3,?4,?5,?6)`, [newId(), job.id, 'tech_joined', JSON.stringify({ userId, via: 'vin' }), nowIso, userId]);
      }
      return json({ jobId: job.id });
    }

    // Vehicles
    if (segment === 'vehicles') {
      if (path[1] === 'search' && method === 'GET') {
        const q = (new URL(request.url)).searchParams.get('q')?.toUpperCase()?.trim() || '';
        if (!q) return json([]);
        let rows = [];
        if (q.length === 17) {
          rows = await qAll(DB, 'SELECT * FROM vehicles WHERE UPPER(vin) = ?1 LIMIT 10', [q]);
        } else {
          rows = await qAll(DB, 'SELECT * FROM vehicles WHERE UPPER(vin) LIKE ?1 OR UPPER(stockNumber) LIKE ?1 LIMIT 20', [`%${q}%`]);
        }
        return json(rows.map(v => ({ ...v, vehicleDescription: v.vehicleDescription || toVehicleDescription(v) })));
      }
      if (path[1] === 'refresh' && method === 'POST') {
        const src = env.INVENTORY_CSV_URL;
        if (!src) return bad('INVENTORY_CSV_URL not set', 500);
        const startedAt = new Date();
        const res = await fetch(src);
        if (!res.ok) return bad('Failed to fetch CSV', 502);
        const text = await res.text();
        const rows = parseCsv(text);
        // Heuristic column mapping
        const header = rows[0] || [];
        const body = rows.slice(1);
        const idx = {
          vin: findCol(header, ['vin','vehicle identification number','v.i.n']),
          stock: findCol(header, ['stock','stock #','stock number','stock#']),
          year: findCol(header, ['year']),
          make: findCol(header, ['make']),
          model: findCol(header, ['model']),
          color: findCol(header, ['color', 'exterior color']),
          mileage: findCol(header, ['mileage', 'odometer']),
          bodyStyle: findCol(header, ['body', 'body style']),
          vehicle: findCol(header, ['vehicle','description']),
        };
        if (idx.vin === -1) return bad('CSV missing VIN column', 400);
        let upserted = 0, modified = 0, total = 0;

        const vehiclePayloads = body.map(r => {
          const vin = (r[idx.vin] || '').toString().trim().toUpperCase();
          if (!vin || vin.length < 6) return null;
          return {
            vin,
            stock: idx.stock === -1 ? '' : (r[idx.stock] || '').toString().trim(),
            year: idx.year === -1 ? null : (parseInt(r[idx.year] || '', 10) || null),
            make: idx.make === -1 ? '' : (r[idx.make] || '').toString().trim(),
            model: idx.model === -1 ? '' : (r[idx.model] || '').toString().trim(),
            color: idx.color === -1 ? '' : (r[idx.color] || '').toString().trim(),
            mileage: idx.mileage === -1 ? null : (parseInt(r[idx.mileage] || '', 10) || null),
            bodyStyle: idx.bodyStyle === -1 ? '' : (r[idx.bodyStyle] || '').toString().trim(),
            vehicleDescription: (idx.vehicle === -1 ? '' : (r[idx.vehicle] || '').toString().trim())
          };
        }).filter(Boolean);

        // Batch fetch existing vehicles for comparison
        const existingVehicles = new Map();
        if (vehiclePayloads.length > 0) {
          const vins = vehiclePayloads.map(v => v.vin);
          const chunkSize = 100;
          for (let i = 0; i < vins.length; i += chunkSize) {
            const chunk = vins.slice(i, i + chunkSize);
            const results = await qAll(DB, `SELECT vin, stockNumber, vehicleDescription, year, make, model, color, mileage, bodyStyle FROM vehicles WHERE vin IN (${'?,'.repeat(chunk.length).slice(0,-1)})`, chunk);
            for (const v of results) existingVehicles.set(v.vin, v);
          }
        }

        const insertStmts = [];
        const updateStmts = [];

        for (const p of vehiclePayloads) {
          total++;
          p.vehicleDescription = p.vehicleDescription || toVehicleDescription(p);
          const existing = existingVehicles.get(p.vin);
          if (!existing) {
            insertStmts.push(DB.prepare(
              'INSERT INTO vehicles (vin,stockNumber,vehicleDescription,year,make,model,color,mileage,bodyStyle,lastSeenAt,createdAt,updatedAt) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?10,?10)'
            ).bind(p.vin, p.stock, p.vehicleDescription, p.year, p.make, p.model, p.color, p.mileage, p.bodyStyle, new Date().toISOString()));
            upserted++;
          } else {
            const changed = (existing.stockNumber !== p.stock) || (existing.vehicleDescription !== p.vehicleDescription) || (existing.year !== p.year) || (existing.make !== p.make) || (existing.model !== p.model) || (existing.color !== p.color) || (existing.mileage !== p.mileage) || (existing.bodyStyle !== p.bodyStyle);
            if (changed) {
              updateStmts.push(DB.prepare(
                'UPDATE vehicles SET stockNumber=?1, vehicleDescription=?2, year=?3, make=?4, model=?5, color=?6, mileage=?7, bodyStyle=?8, updatedAt=?9, lastSeenAt=?9 WHERE vin=?10'
              ).bind(p.stock, p.vehicleDescription, p.year, p.make, p.model, p.color, p.mileage, p.bodyStyle, new Date().toISOString(), p.vin));
              modified++;
            } else {
              updateStmts.push(DB.prepare('UPDATE vehicles SET lastSeenAt=?1 WHERE vin=?2').bind(new Date().toISOString(), p.vin));
            }
          }
        }

        if (insertStmts.length > 0) await DB.batch(insertStmts);
        if (updateStmts.length > 0) await DB.batch(updateStmts);

        const finishedAt = new Date();
        await qRun(DB, `INSERT INTO inventory_refresh_log (id, srcUrl, startedAt, finishedAt, rowsTotal, upserted, modified, error) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)`,
          [newId(), src, startedAt.toISOString(), finishedAt.toISOString(), total, upserted, modified, null]);
        return json({ upserted, modified, total });
      }
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

function toVehicleDescription(v) {
  const parts = [v.year, v.make, v.model].filter(Boolean).join(' ').trim();
  return parts || '';
}

function findCol(header, candidates) {
  const h = header.map(x => String(x || '').trim().toLowerCase());
  for (const c of candidates) {
    const idx = h.indexOf(c);
    if (idx >= 0) return idx;
  }
  return -1;
}
