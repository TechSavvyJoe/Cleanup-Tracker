// Optional index for /api/v2 to provide a simple status and ensure schema
import { ensureSchema, qGet, json, bad } from '../../_lib/db';

function autodetectD1(env) {
	if (env && env.DB) return env.DB;
	try { for (const [_, v] of Object.entries(env || {})) { if (v && typeof v.prepare === 'function' && typeof v.batch === 'function') return v; } } catch {}
	return null;
}

export async function onRequest(context) {
	try {
		const DB = autodetectD1(context?.env);
		if (!DB) return bad('D1 binding missing', 500);
		await ensureSchema(DB);
		const users = await qGet(DB, 'SELECT COUNT(1) c FROM users');
		return json({ ok: true, users: users?.c || 0 });
	} catch (e) {
		return bad(e.message || String(e), 500);
	}
}
