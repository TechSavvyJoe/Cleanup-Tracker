const express = require('express');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Parse JSON bodies
app.use(express.json());

// Enable request logging for debugging
app.use((req, res, next) => {
  console.log(`📥 ${req.method} ${req.url}`);
  next();
});

// 1. FIRST: Handle ALL /api requests with manual proxy
app.all('/api/*', async (req, res) => {
  console.log(`🔄 Manual proxy: ${req.method} ${req.url} -> http://localhost:5051${req.url}`);
  
  try {
    const axios = require('axios');
    const backendUrl = `http://localhost:5051${req.url}`;
    
    const response = await axios({
      method: req.method,
      url: backendUrl,
      data: req.body,
      headers: {
        ...req.headers,
        host: 'localhost:5051' // Update host header for backend
      }
    });
    
    // Copy response headers
    Object.entries(response.headers).forEach(([key, value]) => {
      res.set(key, value);
    });
    
    res.status(response.status).send(response.data);
    console.log(`✅ Manual proxy response: ${response.status} for ${req.method} ${req.url}`);
  } catch (error) {
    console.error(`❌ Manual proxy error: ${error.message}`);
    if (error.response) {
      res.status(error.response.status).send(error.response.data);
    } else {
      res.status(500).json({ error: 'Proxy error', message: error.message });
    }
  }
});

// 2. SECOND: Serve static files from React build (excluding API routes)
app.use(express.static(path.join(__dirname, 'build'), {
  // Don't serve index.html automatically - we'll handle routing manually
  index: false
}));

// 3. THIRD: Handle React routing - send all remaining requests to React app
app.get('*', (req, res) => {
  console.log(`📄 Serving React app for: ${req.url}`);
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Client server running on http://localhost:${PORT}`);
  console.log(`📡 Proxying /api requests to http://localhost:5051`);
});