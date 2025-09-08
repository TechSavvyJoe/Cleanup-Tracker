export async function ensureSchema(DB) {
  // Create tables if not exist. D1 supports IF NOT EXISTS.
  await DB.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      pin TEXT,
      role TEXT,
      uid TEXT,
      username TEXT,
      password TEXT,
      UNIQUE(pin),
      UNIQUE(username)
    );
    CREATE TABLE IF NOT EXISTS vehicles (
      vin TEXT PRIMARY KEY,
      stockNumber TEXT,
      vehicleDescription TEXT,
      year INTEGER,
      make TEXT,
      model TEXT
    );
    CREATE TABLE IF NOT EXISTS jobs (
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
    );
    CREATE INDEX IF NOT EXISTS idx_jobs_date ON jobs(date);
    CREATE INDEX IF NOT EXISTS idx_vehicles_stock ON vehicles(stockNumber);
  `);
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
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
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
