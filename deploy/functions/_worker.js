import * as apiHealth from './api/health.js';
import * as apiV2 from './api/v2/[[path]].js';

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const { pathname } = url;

      // Normalize trailing slashes for API routes
      const path = pathname.replace(/\/+$/, '') || '/';
      console.log('worker:path', path);

      // Basic JSON helper to tag responses
      const tag = (resp) => {
        try { resp.headers.set('X-Worker', 'pages'); } catch {}
        return resp;
      };

      // Route: /api and /api/ -> small JSON to confirm worker is active
      if (path === '/api' || path === '/api/') {
        return tag(new Response(JSON.stringify({ ok: true, api: true }), { status: 200, headers: { 'content-type': 'application/json' } }));
      }

      // Route: /api/health
      if (path === '/api/health' || path.startsWith('/api/health')) {
        return tag(await apiHealth.onRequest({ request, env }));
      }

      // Route: /api/v2/*
      if (path === '/api/v2' || path.startsWith('/api/v2/')) {
        const rest = path.startsWith('/api/v2/') ? path.slice('/api/v2/'.length) : '';
        // Pages Functions normally sets params.path for [[path]]
        const params = { path: rest };
        return tag(await apiV2.onRequest({ request, env, params }));
      }

      // Fall through to static assets for everything else
      return await env.ASSETS.fetch(request, env, ctx);
    } catch (err) {
      console.error('worker:error', err);
      return new Response(JSON.stringify({ ok: false, error: String(err) }), { status: 500, headers: { 'content-type': 'application/json' } });
    }
  }
};
