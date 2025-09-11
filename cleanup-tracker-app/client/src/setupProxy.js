const { createProxyMiddleware } = require('http-proxy-middleware');
const fs = require('fs');
const path = require('path');

module.exports = function(app) {
  // Default to 5051 if .port is missing
  let port = process.env.REACT_APP_SERVER_PORT || '8788';
  try {
    const p = fs.readFileSync(path.resolve(__dirname, '..', '..', 'server', '.port'), 'utf8').trim();
    if (p) port = p;
  } catch (_) {
    // ignore
  }
  const target = process.env.REACT_APP_API_URL || `http://localhost:${port}`;
  app.use(
    ['/api', '/socket.io'],
    createProxyMiddleware({
      target,
      changeOrigin: true,
      ws: true,
      secure: false,
      logLevel: 'silent'
    })
  );
};
