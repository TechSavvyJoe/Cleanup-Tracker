export async function ensureSchema(DB) {
  // Create tables if not exist. Execute statements individually for broader compatibility.
  await DB.exec(`CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      pin TEXT UNIQUE,
      role TEXT,
      uid TEXT UNIQUE,
      username TEXT UNIQUE,
      password TEXT,
      phone TEXT,
      active INTEGER,
      createdAt TEXT,
      updatedAt TEXT
    );`);
  await DB.exec(`CREATE TABLE IF NOT EXISTS vehicles (
      vin TEXT PRIMARY KEY,
      stockNumber TEXT,
      vehicleDescription TEXT,
      year INTEGER,
      make TEXT,
      model TEXT,
      color TEXT,
      mileage INTEGER,
      bodyStyle TEXT,
      lastSeenAt TEXT,
      createdAt TEXT,
      updatedAt TEXT
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
      date TEXT,
      notes TEXT,
      location TEXT,
      price REAL,
      createdAt TEXT,
      updatedAt TEXT
    );`);
  await DB.exec(`CREATE TABLE IF NOT EXISTS job_technicians (
      jobId TEXT NOT NULL,
      userId TEXT NOT NULL,
      assignedAt TEXT,
      startedAt TEXT,
      endedAt TEXT,
      duration INTEGER,
      PRIMARY KEY (jobId, userId)
    );`);
  await DB.exec(`CREATE TABLE IF NOT EXISTS job_events (
      id TEXT PRIMARY KEY,
      jobId TEXT NOT NULL,
      type TEXT NOT NULL,
      payload TEXT,
      at TEXT NOT NULL,
      byUserId TEXT
    );`);
  await DB.exec(`CREATE TABLE IF NOT EXISTS inventory_refresh_log (
      id TEXT PRIMARY KEY,
      srcUrl TEXT,
      startedAt TEXT NOT NULL,
      finishedAt TEXT,
      rowsTotal INTEGER,
      upserted INTEGER,
      modified INTEGER,
      error TEXT
    );`);

  await DB.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_date ON jobs(date);`);
  await DB.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_vin ON jobs(vin);`);
  await DB.exec(`CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);`);
  await DB.exec(`CREATE INDEX IF NOT EXISTS idx_vehicles_stock ON vehicles(stockNumber);`);
  await DB.exec(`CREATE INDEX IF NOT EXISTS idx_job_events_jobId ON job_events(jobId);`);
  await DB.exec(`CREATE INDEX IF NOT EXISTS idx_job_technicians_jobId ON job_technicians(jobId);`);
  await DB.exec(`CREATE INDEX IF NOT EXISTS idx_job_technicians_userId ON job_technicians(userId);`);
}

export function bad(error, status = 500) {
  console.error(`Returning error: [${status}] ${error}`);
  return new Response(JSON.stringify({ error }), { status, headers: { 'Content-Type': 'application/json', 'access-control-allow-origin': '*' } });
}

export function created(data = { ok: true }) {
  return new Response(JSON.stringify(data), { status: 201, headers: { 'Content-Type': 'application/json', 'access-control-allow-origin': '*' } });
}

export function ok(data = { ok: true }) {
  return new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json', 'access-control-allow-origin': '*' } });
}

export function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', 'access-control-allow-origin': '*' } });
}
