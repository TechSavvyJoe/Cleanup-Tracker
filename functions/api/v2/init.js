import { ensureSchema, qAll, qGet, qRun, json, bad, created, ok } from '../../_lib/db';

function autodetectD1(env) {
  if (env && env.DB) return env.DB;
  try {
    for (const [key, val] of Object.entries(env || {})) {
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

async function seedDefaultUsers(DB) {
  // Ensure Manager, Brian (1709), Alfred (1716) exist without duplicating others
  const now = new Date().toISOString();
  const defaults = [
    { name: 'Manager', pin: null, role: 'manager', uid: 'mgr-1', username: 'manager', password: '1234' },
    { name: 'Brian', pin: '1709', role: 'detailer', uid: 'det-brian', username: null, password: null },
    { name: 'Alfred', pin: '1716', role: 'detailer', uid: 'det-alfred', username: null, password: null },
  ];

  let inserted = 0;
  for (const d of defaults) {
    let existing;
    if (d.role === 'manager') {
      existing = await qGet(DB, 'SELECT id FROM users WHERE role = ?1 AND username = ?2', [d.role, d.username]);
    } else {
      existing = await qGet(DB, 'SELECT id FROM users WHERE role = ?1 AND pin = ?2', [d.role, d.pin]);
    }
    if (!existing) {
      const id = newId();
      await qRun(DB, 'INSERT INTO users (id,name,pin,role,uid,username,password,createdAt,updatedAt) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?8)', [
        id, d.name, d.pin, d.role, d.uid, d.username, d.password, now
      ]);
      inserted++;
    }
  }
  const finalCount = await qGet(DB, 'SELECT COUNT(1) c FROM users');
  return { seeded: inserted > 0, inserted, count: (finalCount && finalCount.c != null) ? finalCount.c : null };
}

export async function onRequest(context) {
  try {
    const { env, request } = context;
    const DB = autodetectD1(env);
    if (!DB) return bad('D1 binding missing. Bind your database with the name DB in Pages → Settings → Functions → D1 bindings.', 500);

    if (request.method.toUpperCase() !== 'GET' && request.method.toUpperCase() !== 'POST') {
      return bad('Method not allowed', 405);
    }

    await ensureSchema(DB);
    await seedDefaultUsers(DB);

    const u = await qGet(DB, 'SELECT COUNT(1) c FROM users');
    const j = await qGet(DB, 'SELECT COUNT(1) c FROM jobs');
    const v = await qGet(DB, 'SELECT COUNT(1) c FROM vehicles');
    return json({ ok: true, initialized: true, users: (u && u.c) || 0, jobs: (j && j.c) || 0, vehicles: (v && v.c) || 0 });
  } catch (e) {
    return bad('init failed: ' + ((e && e.message) || String(e)), 500);
  }
}
