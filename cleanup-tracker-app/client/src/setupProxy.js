const { createProxyMiddleware } = require('http-proxy-middleware');
module.exports = function(app) {
  const target = 'http://localhost:5051';
  console.log('Proxy: /api ->', target);
  app.use('/api', createProxyMiddleware({ target, changeOrigin: true, logLevel: 'debug' }));
};