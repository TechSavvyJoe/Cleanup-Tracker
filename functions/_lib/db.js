export async function ensureSchema(DB) {
  // Execute CREATE statements sequentially; keep each as a single line for D1 reliability.
  const statements = [
    `CREATE TABLE IF NOT EXISTS users ( id TEXT PRIMARY KEY, name TEXT NOT NULL, pin TEXT UNIQUE, role TEXT, uid TEXT UNIQUE, username TEXT UNIQUE, password TEXT, phone TEXT, active INTEGER, createdAt TEXT, updatedAt TEXT )`,
    `CREATE TABLE IF NOT EXISTS vehicles ( vin TEXT PRIMARY KEY, stockNumber TEXT, vehicleDescription TEXT, year INTEGER, make TEXT, model TEXT, color TEXT, mileage INTEGER, bodyStyle TEXT, lastSeenAt TEXT, createdAt TEXT, updatedAt TEXT )`,
    `CREATE TABLE IF NOT EXISTS jobs ( id TEXT PRIMARY KEY, technicianId TEXT, technicianName TEXT, vin TEXT, stockNumber TEXT, vehicleDescription TEXT, serviceType TEXT, startTime TEXT, endTime TEXT, duration INTEGER, status TEXT, date TEXT, notes TEXT, location TEXT, price REAL, createdAt TEXT, updatedAt TEXT )`,
    `CREATE TABLE IF NOT EXISTS job_events ( id TEXT PRIMARY KEY, jobId TEXT NOT NULL, type TEXT NOT NULL, payload TEXT, at TEXT NOT NULL, byUserId TEXT )`,
    `CREATE TABLE IF NOT EXISTS job_technicians ( jobId TEXT NOT NULL, userId TEXT NOT NULL, assignedAt TEXT, startedAt TEXT, endedAt TEXT, duration INTEGER, PRIMARY KEY (jobId, userId) )`,
    `CREATE TABLE IF NOT EXISTS inventory_refresh_log ( id TEXT PRIMARY KEY, srcUrl TEXT, startedAt TEXT NOT NULL, finishedAt TEXT, rowsTotal INTEGER, upserted INTEGER, modified INTEGER, error TEXT )`,
    `CREATE INDEX IF NOT EXISTS idx_jobs_date ON jobs(date)`,
    `CREATE INDEX IF NOT EXISTS idx_jobs_vin ON jobs(vin)`,
    `CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status)`,
    `CREATE INDEX IF NOT EXISTS idx_vehicles_stock ON vehicles(stockNumber)`,
    `CREATE INDEX IF NOT EXISTS idx_job_events_jobId ON job_events(jobId)`,
    `CREATE INDEX IF NOT EXISTS idx_job_technicians_jobId ON job_technicians(jobId)`
  ];
  const toSingleLine = (sql) => sql.replace(/\s+/g, ' ').trim().replace(/;$/, '');
  for (const s of statements) {
    const sql = toSingleLine(s);
    try {
      await DB.prepare(sql).run();
    } catch (e) {
      console.error('Schema statement failed:', sql, e);
      throw e;
    }
  }
}

export function bad(error, status = 500) {
  console.error(`Returning error: [${status}] ${error}`);
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { 'Content-Type': 'application/json', 'access-control-allow-origin': '*' }
  });
}

export function created(data = { ok: true }) {
  return new Response(JSON.stringify(data), {
    status: 201,
    headers: { 'Content-Type': 'application/json', 'access-control-allow-origin': '*' }
  });
}

export function ok(data = { ok: true }) {
  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'access-control-allow-origin': '*' }
  });
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'access-control-allow-origin': '*' }
  });
}

// Lightweight query helpers used by the API router
export async function qAll(DB, sql, params = []) {
  const stmt = params && params.length ? DB.prepare(sql).bind(...params) : DB.prepare(sql);
  const res = await stmt.all();
  return res?.results ?? res ?? [];
}

export async function qGet(DB, sql, params = []) {
  const stmt = params && params.length ? DB.prepare(sql).bind(...params) : DB.prepare(sql);
  const first = await stmt.first();
  if (first !== undefined) return first;
  const res = await stmt.all().catch(() => null);
  return res && res.results && res.results.length ? res.results[0] : undefined;
}

export async function qRun(DB, sql, params = []) {
  const stmt = params && params.length ? DB.prepare(sql).bind(...params) : DB.prepare(sql);
  return await stmt.run();
}
