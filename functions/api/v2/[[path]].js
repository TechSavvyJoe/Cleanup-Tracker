// Cloudflare Pages Function: proxy to backend API
// Requires environment variable API_BASE (e.g., https://your-backend.onrender.com)

export async function onRequest(context) {
  const { request, env, params } = context;
  const apiBase = env.API_BASE;
  if (!apiBase) {
    return new Response(JSON.stringify({ error: 'API_BASE not configured' }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
  const url = new URL(request.url);
  const tail = params.path ? `/${params.path}` : '';
  const target = `${apiBase}/api/v2${tail}${url.search}`;
  const init = {
    method: request.method,
    headers: new Headers(request.headers),
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.blob(),
  };
  // Remove Cloudflare-specific and hop-by-hop headers
  init.headers.delete('host');
  init.headers.delete('cf-connecting-ip');
  init.headers.delete('cf-ipcountry');
  init.headers.delete('cf-ray');
  init.headers.delete('cf-visitor');
  init.headers.delete('x-forwarded-proto');
  init.headers.delete('x-forwarded-for');
  const resp = await fetch(target, init);
  // Stream response through
  const outHeaders = new Headers(resp.headers);
  outHeaders.set('access-control-allow-origin', '*');
  return new Response(resp.body, { status: resp.status, headers: outHeaders });
}
