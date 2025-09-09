import * as apiHealth from './api/health.js';
import * as apiV2 from './api/v2/[[path]].js';

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;

    // Normalize trailing slashes for API routes
    const path = pathname.replace(/\/+$/, '') || '/';

    // Route: /api/health
    if (path === '/api/health') {
      return apiHealth.onRequest({ request, env });
    }

    // Route: /api/v2/*
    if (path === '/api/v2' || path.startsWith('/api/v2/')) {
      const rest = path.startsWith('/api/v2/') ? path.slice('/api/v2/'.length) : '';
      // Pages Functions normally sets params.path for [[path]]
      const params = { path: rest };
      return apiV2.onRequest({ request, env, params });
    }

    // Fall through to static assets for everything else
    return env.ASSETS.fetch(request, env, ctx);
  }
};
