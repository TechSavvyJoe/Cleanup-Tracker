export async function ensureSchema(DB) {
  // Create tables if not exist. Execute statements individually for broader compatibility.
  await DB.exec(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      pin TEXT,
      role TEXT,
      uid TEXT,
      username TEXT,
      password TEXT,
      UNIQUE(pin),
      UNIQUE(username)
    );`);
  await DB.exec(`CREATE TABLE IF NOT EXISTS vehicles (
      vin TEXT PRIMARY KEY,
      stockNumber TEXT,
      vehicleDescription TEXT,
      year INTEGER,
      make TEXT,
      model TEXT
    );`);
  await DB.exec(`CREATE TABLE IF NOT EXISTS jobs (
      id TEXT PRIMARY KEY,
      technicianId TEXT,
      technicianName TEXT,
      vin TEXT,
      stockNumber TEXT,
      vehicleDescription TEXT,
      serviceType TEXT,
      startTime TEXT,
      endTime TEXT,
      duration INTEGER,
      status TEXT,
      date TEXT
    );`);
  await DB.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_date ON jobs(date);`);
  await DB.exec(`CREATE INDEX IF NOT EXISTS idx_vehicles_stock ON vehicles(stockNumber);`);

  // Auto-seed default users on first run (idempotent)
  try {
    const { results } = await DB.prepare('SELECT COUNT(1) as c FROM users').all();
    const count = (results && results[0] && results[0].c) || 0;
    if (count === 0) {
      const defaults = [
        { id: crypto.randomUUID(), name: 'Manager', pin: null, role: 'manager', uid: 'mgr-1', username: 'manager', password: '1234' },
        { id: crypto.randomUUID(), name: 'Alice Detail', pin: '1111', role: 'detailer', uid: 'det-1', username: null, password: null },
        { id: crypto.randomUUID(), name: 'Bob Detail', pin: '2222', role: 'detailer', uid: 'det-2', username: null, password: null },
      ];
      for (const u of defaults) {
        await DB.prepare('INSERT OR IGNORE INTO users (id,name,pin,role,uid,username,password) VALUES (?1,?2,?3,?4,?5,?6,?7)')
          .bind(u.id, u.name, u.pin, u.role, u.uid, u.username, u.password)
          .run();
      }
    }
  } catch (e) {
    // ignore seed errors; normal API can still handle manual seeding
  }
}

export async function qAll(DB, sql, params = []) {
  const { results } = await DB.prepare(sql).bind(...params).all();
  return results || [];
}

export async function qGet(DB, sql, params = []) {
  const { results } = await DB.prepare(sql).bind(...params).all();
  return (results && results[0]) || null;
}

export async function qRun(DB, sql, params = []) {
  try {
    const info = await DB.prepare(sql).bind(...params).run();
    return { success: true, meta: info };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,PUT,DELETE,OPTIONS',
      'access-control-allow-headers': 'Content-Type'
    },
  });
}

export function bad(message, status = 400) {
  return json({ error: message }, status);
}

export function ok() {
  return json({ ok: true }, 200);
}

export function created(data) {
  return json(data || { ok: true }, 201);
}
