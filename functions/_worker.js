import * as apiHealth from './api/health.js';
import * as apiV2 from './api/v2/[[path]].js';

const routes = [
  {
    test: (p) => p === '/api',
    handler: () => Response.json({ ok: true, api: true })
  },
  {
    test: (p) => p.startsWith('/api/health'),
    handler: (ctx) => apiHealth.onRequest(ctx)
  },
  {
    test: (p) => p === '/api/v2' || p.startsWith('/api/v2/'),
    handler: (ctx, p) => {
      const rest = p.replace(/^\/api\/v2\/?/, '');
      const params = { path: rest };
      return apiV2.onRequest({ ...ctx, params });
    }
  }
];

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const path = url.pathname.replace(/\/+$/, '') || '/';
      const log = env.DEBUG ? console.log.bind(console) : () => {};
      log('worker:path', path);

      for (const r of routes) {
        if (r.test(path)) {
          const resp = await r.handler({ request, env, ctx }, path);
          try { resp.headers.set('X-Worker', 'pages'); } catch {}
          return resp;
        }
      }

      return env.ASSETS.fetch(request, env, ctx);
    } catch (err) {
      console.error('worker:error', err);
      return Response.json({ ok: false, error: String(err) }, { status: 500 });
    }
  }
};
