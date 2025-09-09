import * as apiHealth from './functions/api/health.js';
import * as apiV2 from './functions/api/v2/[[path]].js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = (url.pathname.replace(/\/+$/, '') || '/');

    const tag = (resp) => { try { resp.headers.set('X-Worker', 'advanced'); } catch {} return resp; };

    // Basic probe
    if (path === '/api' || path === '/api/') {
      return tag(new Response(JSON.stringify({ ok: true, api: true }), { status: 200, headers: { 'content-type': 'application/json' } }));
    }

    if (path === '/api/health' || path.startsWith('/api/health')) {
      return tag(await apiHealth.onRequest({ request, env }));
    }

    if (path === '/api/v2' || path.startsWith('/api/v2/')) {
      const rest = path.startsWith('/api/v2/') ? path.slice('/api/v2/'.length) : '';
      const params = { path: rest };
      return tag(await apiV2.onRequest({ request, env, params }));
    }

    // Static assets
    return env.ASSETS.fetch(request, env, ctx);
  }
};
