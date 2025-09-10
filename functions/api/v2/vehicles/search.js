import { ensureSchema, qAll, json, bad } from '../../../_lib/db';

function autodetectD1(env) {
  if (env && env.DB) return env.DB;
  try { for (const k in (env || {})) { const v = env[k]; if (v && typeof v.prepare === 'function' && typeof v.batch === 'function') return v; } } catch {}
  return null;
}

function toVehicleDescription(v) {
  const parts = [v.year, v.make, v.model].filter(Boolean).join(' ').trim();
  return parts || (v.vehicleDescription || '');
}

export async function onRequest(context) {
  try {
    const request = context && context.request ? context.request : null;
    const method = request ? request.method.toUpperCase() : 'GET';
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET,OPTIONS',
        'access-control-allow-headers': request && request.headers ? (request.headers.get('access-control-request-headers') || 'Content-Type') : 'Content-Type',
        'access-control-max-age': '86400'
      }});
    }
    if (method !== 'GET') return bad('Method not allowed', 405);

    const DB = autodetectD1(context && context.env ? context.env : {});
    if (!DB) return bad('D1 binding missing. Bind DB in Pages → Settings → Functions → D1 bindings.', 500);
    await ensureSchema(DB);

    const url = new URL(request.url);
    const q = (url.searchParams.get('q') || '').toUpperCase().trim();
    if (!q) return json([]);

    let rows = [];
    if (q.length === 17) {
      rows = await qAll(DB, 'SELECT * FROM vehicles WHERE UPPER(vin) = ?1 LIMIT 10', [q]);
    } else {
      rows = await qAll(DB, 'SELECT * FROM vehicles WHERE UPPER(vin) LIKE ?1 OR UPPER(stockNumber) LIKE ?1 OR UPPER(vehicleDescription) LIKE ?1 LIMIT 20', [`%${q}%`]);
    }
    return json(rows.map(v => ({ vin: v.vin, stockNumber: v.stockNumber, vehicleDescription: toVehicleDescription(v), year: v.year, make: v.make, model: v.model })));
  } catch (e) {
    return bad('vehicles/search error: ' + (e && e.message ? e.message : String(e)), 500);
  }
}
