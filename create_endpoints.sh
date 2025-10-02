#!/bin/bash

# Navigate to functions directory
cd "cleanup-tracker-app/functions/api/v2"

# Create job sub-endpoints
mkdir -p "jobs/[id]"

# jobs/[id]/start.js
cat > "jobs/[id]/start.js" << 'EOF'
export async function onRequestPut(context) {
  const { env, params } = context;
  const stmt = env.DB.prepare('UPDATE jobs SET status = ?, startedAt = ?, updatedAt = ? WHERE id = ?');
  const now = new Date().toISOString();
  await stmt.bind('In Progress', now, now, params.id).run();
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'PUT, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
EOF

# jobs/[id]/stop.js
cat > "jobs/[id]/stop.js" << 'EOF'
export async function onRequestPut(context) {
  const { env, params } = context;
  const stmt = env.DB.prepare('UPDATE jobs SET status = ?, updatedAt = ? WHERE id = ?');
  await stmt.bind('Paused', new Date().toISOString(), params.id).run();
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'PUT, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
EOF

# jobs/[id]/complete.js
cat > "jobs/[id]/complete.js" << 'EOF'
export async function onRequestPut(context) {
  const { env, params, request } = context;
  const { duration, notes } = await request.json();
  const now = new Date().toISOString();
  const stmt = env.DB.prepare('UPDATE jobs SET status = ?, completedAt = ?, actualDuration = ?, notes = ?, updatedAt = ? WHERE id = ?');
  await stmt.bind('Completed', now, duration || null, notes || null, now, params.id).run();
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'PUT, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
EOF

# jobs/[id]/status.js
cat > "jobs/[id]/status.js" << 'EOF'
export async function onRequestPut(context) {
  const { env, params, request } = context;
  const { status } = await request.json();
  const stmt = env.DB.prepare('UPDATE jobs SET status = ?, updatedAt = ? WHERE id = ?');
  await stmt.bind(status, new Date().toISOString(), params.id).run();
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'PUT, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
EOF

# jobs/[id]/pause.js
cat > "jobs/[id]/pause.js" << 'EOF'
export async function onRequestPost(context) {
  const { env, params } = context;
  const stmt = env.DB.prepare('UPDATE jobs SET status = ?, updatedAt = ? WHERE id = ?');
  await stmt.bind('Paused', new Date().toISOString(), params.id).run();
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
EOF

# jobs/[id]/qc.js
cat > "jobs/[id]/qc.js" << 'EOF'
export async function onRequestPost(context) {
  const { env, params, request } = context;
  const { passed, issues } = await request.json();
  const status = passed ? 'Completed' : 'QC Required';
  const now = new Date().toISOString();
  const stmt = env.DB.prepare('UPDATE jobs SET status = ?, qcIssues = ?, updatedAt = ? WHERE id = ?');
  await stmt.bind(status, issues || null, now, params.id).run();
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
EOF

# jobs/[id]/message.js
cat > "jobs/[id]/message.js" << 'EOF'
export async function onRequestPost(context) {
  const { env, params, request } = context;
  const { message, userName } = await request.json();
  const getStmt = env.DB.prepare('SELECT notes FROM jobs WHERE id = ?');
  const job = await getStmt.bind(params.id).first();
  const timestamp = new Date().toISOString();
  const newNote = `[${timestamp}] ${userName || 'User'}: ${message}`;
  const updatedNotes = job?.notes ? `${job.notes}\n${newNote}` : newNote;
  const updateStmt = env.DB.prepare('UPDATE jobs SET notes = ?, updatedAt = ? WHERE id = ?');
  await updateStmt.bind(updatedNotes, timestamp, params.id).run();
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
EOF

# jobs/[id]/add-technician.js
cat > "jobs/[id]/add-technician.js" << 'EOF'
export async function onRequestPost(context) {
  const { env, params, request } = context;
  const { technicianId } = await request.json();
  const userStmt = env.DB.prepare('SELECT name FROM users WHERE id = ?');
  const user = await userStmt.bind(technicianId).first();
  const stmt = env.DB.prepare('UPDATE jobs SET technicianId = ?, technicianName = ?, updatedAt = ? WHERE id = ?');
  await stmt.bind(technicianId, user?.name, new Date().toISOString(), params.id).run();
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
EOF

# users/[id].js
mkdir -p "users"
cat > "users/[id].js" << 'EOF'
export async function onRequestGet(context) {
  const { env, params } = context;
  const stmt = env.DB.prepare('SELECT * FROM users WHERE id = ?');
  const user = await stmt.bind(params.id).first();
  if (user) delete user.pin;
  return new Response(JSON.stringify(user || {}), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
export async function onRequestPut(context) {
  const { env, params, request } = context;
  const data = await request.json();
  const fields = [];
  const values = [];
  if (data.name) { fields.push('name = ?'); values.push(data.name); }
  if (data.role) { fields.push('role = ?'); values.push(data.role); }
  if (data.pin) { fields.push('pin = ?'); values.push(data.pin); }
  if (data.isActive !== undefined) { fields.push('isActive = ?'); values.push(data.isActive ? 1 : 0); }
  fields.push('updatedAt = ?');
  values.push(new Date().toISOString(), params.id);
  const stmt = env.DB.prepare(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`);
  await stmt.bind(...values).run();
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
export async function onRequestDelete(context) {
  const { env, params } = context;
  const stmt = env.DB.prepare('DELETE FROM users WHERE id = ?');
  await stmt.bind(params.id).run();
  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, PUT, DELETE, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
EOF

# vehicles/join-by-vin.js
cat > "vehicles/join-by-vin.js" << 'EOF'
export async function onRequestPut(context) {
  const { env, request } = context;
  const { vin, jobId } = await request.json();
  const vehicleStmt = env.DB.prepare('SELECT * FROM vehicles WHERE vin = ?');
  const vehicle = await vehicleStmt.bind(vin).first();
  if (!vehicle) {
    return new Response(JSON.stringify({ success: false, message: 'Vehicle not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
  const description = `${vehicle.year} ${vehicle.make} ${vehicle.model}`.trim();
  const jobStmt = env.DB.prepare('UPDATE jobs SET vin = ?, stockNumber = ?, vehicleDescription = ?, updatedAt = ? WHERE id = ?');
  await jobStmt.bind(vehicle.vin, vehicle.stockNumber, vehicle.vehicleDescription || description, new Date().toISOString(), jobId).run();
  return new Response(JSON.stringify({ success: true, vehicle }), {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'PUT, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
EOF

echo "All endpoints created successfully!"
