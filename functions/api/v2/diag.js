import { qGet, json } from '../../_lib/db';

function autodetectD1(env) {
  if (env && env.DB) return env.DB;
  try {
    for (const [key, val] of Object.entries(env || {})) {
      if (val && typeof val.prepare === 'function' && typeof val.batch === 'function') return val;
    }
  } catch {}
  return null;
}

function detectD1BindingName(env) {
  if (env && env.DB) return 'DB';
  try {
    for (const [key, val] of Object.entries(env || {})) {
      if (val && typeof val.prepare === 'function' && typeof val.batch === 'function') return key;
    }
  } catch {}
  return null;
}

export async function onRequest(context) {
  try {
    const { env } = context;
    const DB = autodetectD1(env);
    const bindingName = detectD1BindingName(env);
    if (!DB) {
      return json({ dbBound: false, bindingName: bindingName || null, users: 0, jobs: 0, vehicles: 0 });
    }
    let users = 0, jobs = 0, vehicles = 0;
    try { users = (await qGet(DB, 'SELECT COUNT(1) c FROM users'))?.c ?? 0; } catch {}
    try { jobs = (await qGet(DB, 'SELECT COUNT(1) c FROM jobs'))?.c ?? 0; } catch {}
    try { vehicles = (await qGet(DB, 'SELECT COUNT(1) c FROM vehicles'))?.c ?? 0; } catch {}
    return json({ dbBound: true, bindingName, users, jobs, vehicles });
  } catch (e) {
    return json({ dbBound: false, error: (e && e.message) || String(e) }, 500);
  }
}
