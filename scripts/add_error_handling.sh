#!/bin/bash

cd "cleanup-tracker-app/functions/api/v2/jobs/[id]"

# start.js
cat > start.js << 'EOF'
export async function onRequestPut(context) {
  try {
    const { env, params } = context;
    const now = new Date().toISOString();
    const stmt = env.DB.prepare('UPDATE jobs SET status = ?, startedAt = ?, updatedAt = ? WHERE id = ?');
    await stmt.bind('In Progress', now, now, params.id).run();
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to start job', message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'PUT, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
EOF

# stop.js
cat > stop.js << 'EOF'
export async function onRequestPut(context) {
  try {
    const { env, params } = context;
    const stmt = env.DB.prepare('UPDATE jobs SET status = ?, updatedAt = ? WHERE id = ?');
    await stmt.bind('Paused', new Date().toISOString(), params.id).run();
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to stop job', message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'PUT, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
EOF

# pause.js  
cat > pause.js << 'EOF'
export async function onRequestPost(context) {
  try {
    const { env, params } = context;
    const stmt = env.DB.prepare('UPDATE jobs SET status = ?, updatedAt = ? WHERE id = ?');
    await stmt.bind('Paused', new Date().toISOString(), params.id).run();
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to pause job', message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
EOF

# status.js
cat > status.js << 'EOF'
export async function onRequestPut(context) {
  try {
    const { env, params, request } = context;
    const { status } = await request.json();
    const stmt = env.DB.prepare('UPDATE jobs SET status = ?, updatedAt = ? WHERE id = ?');
    await stmt.bind(status, new Date().toISOString(), params.id).run();
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to update job status', message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'PUT, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
EOF

# qc.js
cat > qc.js << 'EOF'
export async function onRequestPost(context) {
  try {
    const { env, params, request } = context;
    const { passed, issues } = await request.json();
    const status = passed ? 'Completed' : 'QC Required';
    const stmt = env.DB.prepare('UPDATE jobs SET status = ?, qcIssues = ?, updatedAt = ? WHERE id = ?');
    await stmt.bind(status, issues || null, new Date().toISOString(), params.id).run();
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to update QC status', message: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
    });
  }
}
export async function onRequestOptions() {
  return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}
EOF

echo "✅ All endpoint files updated with error handling!"
