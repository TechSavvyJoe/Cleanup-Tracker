const { createProxyMiddleware } = require('http-proxy-middleware');
const http = require('http');
const fs = require('fs');
const path = require('path');

module.exports = function (app) {
  // Dynamic target selection between Express (5051) and Wrangler Pages dev (8788)
  let currentTarget = 'http://localhost:5051';
  let lastHealthy = 0;
  const HEALTHY_TTL = 5000; // ms

  const checkBackendHealth = () => {
    const now = Date.now();
    if (now - lastHealthy < HEALTHY_TTL) return;

    // Gather candidate backend ports: common defaults plus optional server/.port file
    const candidates = [5051, 5052, 5053, 5054];
    try {
      const portFile = path.join(__dirname, '..', 'server', '.port');
      if (fs.existsSync(portFile)) {
        const filePort = parseInt(String(fs.readFileSync(portFile)).trim(), 10);
        if (!Number.isNaN(filePort) && !candidates.includes(filePort)) {
          candidates.push(filePort);
        }
      }
    } catch {}
    let checked = 0;
    let switched = false;

    const tryPort = (port) => {
      const req = http.get({ hostname: 'localhost', port, path: '/api/health', timeout: 600 }, (res) => {
        if (res.statusCode === 200 && !switched) {
          const target = `http://localhost:${port}`;
          if (currentTarget !== target) {
            console.log(`🔁 Backend healthy on ${target}. Switching proxy target.`);
          }
          currentTarget = target;
          lastHealthy = now;
          switched = true;
        }
        res.resume();
        done();
      });
      req.on('timeout', () => { req.destroy(new Error('timeout')); });
      req.on('error', () => { done(); });
    };

    const done = () => {
      checked += 1;
      if (checked === candidates.length && !switched) {
        if (currentTarget !== 'http://localhost:8788') {
          console.warn('⚠️ No backend ports healthy. Falling back proxy target to http://localhost:8788');
        }
        currentTarget = 'http://localhost:8788';
      }
    };

    candidates.forEach(tryPort);
  };

  // Periodic health check
  setInterval(checkBackendHealth, 1500);
  // Initial check
  checkBackendHealth();

  console.log('✅ Setting up dynamic proxy for /api -> http://localhost:5051 (fallback http://localhost:8788)');

  const proxyMiddleware = createProxyMiddleware('/api', {
    target: currentTarget,
    changeOrigin: true,
    secure: false,
    logLevel: 'silent',
    router: () => currentTarget,
    onProxyReq: (proxyReq, req, res) => {
      if (process.env.DEBUG_PROXY === '1') {
        console.log('🔄 Proxying request:', req.method, req.url, '->', currentTarget + req.url);
      }
    },
    onProxyRes: (proxyRes, req, res) => {
      if (process.env.DEBUG_PROXY === '1') {
        console.log('✅ Proxy response:', proxyRes.statusCode, req.method, req.url, 'from', currentTarget);
      }
    },
    onError: (err, req, res) => {
      console.error('❌ Proxy error:', err.message);
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Proxy error', details: err.message }));
    },
  });

  app.use(proxyMiddleware);
};