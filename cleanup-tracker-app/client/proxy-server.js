const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');

const app = express();
const PORT = 3000;

console.log('🚀 Starting Cleanup Tracker Enterprise Application...');

// Serve static files from build directory
app.use(express.static(path.join(__dirname, 'build')));

// Proxy API requests to backend
app.use('/api', createProxyMiddleware({
  target: 'http://localhost:5051',
  changeOrigin: true,
  secure: false,
  logLevel: 'debug',
  pathRewrite: {
    '^/api': '/api', // Keep the /api prefix
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log('🔄 Proxying API request:', req.method, req.url, '-> http://localhost:5051' + req.url);
  },
  onProxyRes: (proxyRes, req, res) => {
    console.log('✅ API Response:', proxyRes.statusCode, req.method, req.url);
  },
  onError: (err, req, res) => {
    console.error('❌ Proxy error:', err.message);
    res.status(500).json({ error: 'Proxy error', message: err.message });
  }
}));

// Handle React Router (return index.html for all non-API routes)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log('');
  console.log('🎉 ===== CLEANUP TRACKER ENTERPRISE READY! =====');
  console.log('');
  console.log('🌟 Frontend:  http://localhost:3000');
  console.log('🔧 Backend:   http://localhost:5051');
  console.log('');
  console.log('💼 Manager Login: MGR001 / 1701');
  console.log('👨‍🔧 Detailer Login: EMP001 / 1234');
  console.log('');
  console.log('🚀 Open http://localhost:3000 in your browser!');
  console.log('===============================================');
});