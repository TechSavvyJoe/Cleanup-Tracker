import { ensureSchema, qAll, qGet, qRun, json, bad, created, ok } from '../../_lib/db';
import { parseCsv } from '../../_lib/csv';

function autodetectD1(env) {
  if (env.DB) return env.DB;
  // Try to find a D1-like binding by duck-typing (prepare/batch/exec exist)
  for (const [key, val] of Object.entries(env)) {
    if (val && typeof val.prepare === 'function' && typeof val.batch === 'function') {
      return val;
    }
  }
  return null;
}

export async function onRequest(context) {
  const { request, env, params } = context;
  // Handle CORS preflight quickly
  if (request.method.toUpperCase() === 'OPTIONS') {
    return new Response(null, { status: 204, headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'access-control-allow-headers': 'Content-Type'
    }});
  }
  const DB = autodetectD1(env);
  if (!DB) {
    return bad('D1 binding missing. In Cloudflare Pages → Settings → Functions → D1 bindings, bind your database with the binding name DB.', 500);
  }
  await ensureSchema(DB);

  const url = new URL(request.url);
  const path = (params.path || '').split('/').filter(Boolean);
  const [segment, id, sub] = path; // e.g., jobs/:id/complete
  const method = request.method.toUpperCase();

  try {
    // Diagnostics
    if (segment === 'diag' && method === 'GET') {
      if (!DB) return json({ dbBound: false });
      let users = 0, jobs = 0, vehicles = 0;
      try {
        const uc = await qGet(DB, 'SELECT COUNT(1) c FROM users'); users = uc?.c ?? 0;
      } catch {}
      try {
        const jc = await qGet(DB, 'SELECT COUNT(1) c FROM jobs'); jobs = jc?.c ?? 0;
      } catch {}
      try {
        const vc = await qGet(DB, 'SELECT COUNT(1) c FROM vehicles'); vehicles = vc?.c ?? 0;
      } catch {}
      return json({ dbBound: true, users, jobs, vehicles });
    }
    // Seed users
    if (segment === 'seed-users' && method === 'POST') {
      const defaults = [
        { id: crypto.randomUUID(), name: 'Manager', pin: null, role: 'manager', uid: 'mgr-1', username: 'manager', password: '1234' },
        { id: crypto.randomUUID(), name: 'Alice Detail', pin: '1111', role: 'detailer', uid: 'det-1', username: null, password: null },
        { id: crypto.randomUUID(), name: 'Bob Detail', pin: '2222', role: 'detailer', uid: 'det-2', username: null, password: null },
      ];
      let inserted = 0;
      for (const u of defaults) {
        const res = await qRun(DB, `INSERT OR IGNORE INTO users (id,name,pin,role,uid,username,password)
          VALUES (?1,?2,?3,?4,?5,?6,?7)`, [u.id, u.name, u.pin, u.role, u.uid, u.username, u.password]);
        if (res.success) inserted += (res.meta?.changes || 0);
      }
      return json({ inserted });
    }

    // Users
    if (segment === 'users') {
      if (method === 'GET') {
  const rows = await qAll(DB, 'SELECT * FROM users ORDER BY name');
        return json(rows.map(u => ({
          _id: u.id,
          name: u.name,
          pin: u.pin,
          role: u.role,
          uid: u.uid,
          username: u.username,
          password: u.password,
        })));
      }
      if (method === 'POST') {
        const body = await request.json();
        if (!body?.name || !body?.pin) return bad('name and pin required', 400);
  const existing = await qGet(DB, 'SELECT id FROM users WHERE pin = ?1', [body.pin]);
        if (existing) return bad('PIN already in use', 409);
        const idv = crypto.randomUUID();
        const uid = `det-${idv.slice(0,8)}`;
  await qRun(DB, 'INSERT INTO users (id,name,pin,role,uid) VALUES (?1,?2,?3,?4,?5)', [idv, body.name, String(body.pin), 'detailer', uid]);
        return created({ _id: idv, name: body.name, pin: String(body.pin), role: 'detailer', uid });
      }
      if (id && method === 'PUT') {
        const body = await request.json();
        if (!body?.name || !body?.pin) return bad('name and pin required', 400);
  const other = await qGet(DB, 'SELECT id FROM users WHERE pin = ?1 AND id <> ?2', [String(body.pin), id]);
        if (other) return bad('PIN already in use', 409);
  await qRun(DB, 'UPDATE users SET name = ?1, pin = ?2 WHERE id = ?3', [body.name, String(body.pin), id]);
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
          return json(rows.map(toJobDto));
        } catch (err) {
          // If the table isn't ready yet for some reason, ensure schema and return empty list instead of failing UI
          if ((err?.message || '').includes('no such table')) {
            await ensureSchema(DB);
            return json([]);
          }
          throw err;
        }
      }
      if (method === 'POST') {
        const body = await request.json();
        const now = new Date();
        const idv = crypto.randomUUID();
        const date = (body?.date) || now.toISOString().split('T')[0];
        await qRun(DB, `INSERT INTO jobs (id,technicianId,technicianName,vin,stockNumber,vehicleDescription,serviceType,startTime,endTime,duration,status,date,notes,location,price,createdAt,updatedAt)
          VALUES (?1,?2,?3,?4,?5,?6,?7,?8,NULL,NULL,'In Progress',?9,?10,?11,?12,?13,?13)`, [
          idv, body.technicianId, body.technicianName, body.vin, body.stockNumber, body.vehicleDescription, body.serviceType, now.toISOString(), date,
          body.notes || null, body.location || null, body.price ?? null, now.toISOString()
        ]);
        // job event
        await qRun(DB, `INSERT INTO job_events (id, jobId, type, payload, at, byUserId) VALUES (?1,?2,?3,?4,?5,?6)`,
          [crypto.randomUUID(), idv, 'job_started', JSON.stringify(body || {}), now.toISOString(), body.technicianId || null]);
        return created({ _id: idv });
      }
      if (id && sub === 'complete' && method === 'PUT') {
  const job = await qGet(DB, 'SELECT startTime FROM jobs WHERE id = ?1', [id]);
        if (!job?.startTime) return bad('job not found', 404);
        const end = new Date();
        const duration = end - new Date(job.startTime);
        await qRun(DB, 'UPDATE jobs SET endTime = ?1, duration = ?2, status = ?3, updatedAt = ?4 WHERE id = ?5', [end.toISOString(), duration, 'Completed', end.toISOString(), id]);
        await qRun(DB, `INSERT INTO job_events (id, jobId, type, payload, at) VALUES (?1,?2,?3,?4,?5)`,
          [crypto.randomUUID(), id, 'job_completed', JSON.stringify({ duration }), end.toISOString()]);
        return ok();
      }
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
          vehicle: findCol(header, ['vehicle','description']),
        };
        if (idx.vin === -1) return bad('CSV missing VIN column', 400);
  let upserted = 0, modified = 0, total = 0;
        const tx = await DB.batch([]); // no-op to ensure DB is available
        for (const r of body) {
          total++;
          const vin = (r[idx.vin] || '').toString().trim().toUpperCase();
          if (!vin || vin.length < 6) continue;
          const stock = idx.stock === -1 ? '' : (r[idx.stock] || '').toString().trim();
          const year = idx.year === -1 ? null : (parseInt(r[idx.year] || '', 10) || null);
          const make = idx.make === -1 ? '' : (r[idx.make] || '').toString().trim();
          const model = idx.model === -1 ? '' : (r[idx.model] || '').toString().trim();
          const vehicleDescription = (idx.vehicle === -1 ? '' : (r[idx.vehicle] || '').toString().trim()) || toVehicleDescription({year,make,model});
          const existing = await qGet(DB, 'SELECT vin, stockNumber, vehicleDescription FROM vehicles WHERE vin = ?1', [vin]);
          if (!existing) {
            await qRun(DB, 'INSERT INTO vehicles (vin,stockNumber,vehicleDescription,year,make,model,lastSeenAt,createdAt,updatedAt) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?8)', [vin, stock, vehicleDescription, year, make, model, new Date().toISOString(), new Date().toISOString()]);
            upserted++;
          } else {
            const changed = (existing.stockNumber !== stock) || (existing.vehicleDescription !== vehicleDescription);
            if (changed) {
              await qRun(DB, 'UPDATE vehicles SET stockNumber = ?1, vehicleDescription = ?2, year = ?3, make = ?4, model = ?5, updatedAt = ?6, lastSeenAt = ?6 WHERE vin = ?7', [stock, vehicleDescription, year, make, model, new Date().toISOString(), vin]);
              modified++;
            }
          }
        }
        const finishedAt = new Date();
        await qRun(DB, `INSERT INTO inventory_refresh_log (id, srcUrl, startedAt, finishedAt, rowsTotal, upserted, modified, error) VALUES (?1,?2,?3,?4,?5,?6,?7,?8)`,
          [crypto.randomUUID(), src, startedAt.toISOString(), finishedAt.toISOString(), total, upserted, modified, null]);
        return json({ upserted, modified, total });
      }
    }

    return bad('Not found', 404);
  } catch (e) {
    return bad(`Error: ${e.message || e}`, 500);
  }
}

function toJobDto(j) {
  return {
    _id: j.id,
    technicianId: j.technicianId,
    technicianName: j.technicianName,
    vin: j.vin,
    stockNumber: j.stockNumber,
    vehicleDescription: j.vehicleDescription,
    serviceType: j.serviceType,
    startTime: j.startTime,
    endTime: j.endTime,
    duration: j.duration,
    status: j.status,
    date: j.date,
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

