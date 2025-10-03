const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  console.log('✅ Setting up proxy middleware');
  
  app.use(
    createProxyMiddleware('/api', {
      target: 'http://localhost:5051',
      changeOrigin: true,
      secure: false,
      logLevel: 'debug'
    })
  );
};