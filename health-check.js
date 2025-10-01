#!/usr/bin/env node

// Health Check Script for Cleanup Tracker
// Run with: node health-check.js

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  serverUrl: process.env.SERVER_URL || 'http://localhost:5051',
  timeout: 10000,
  endpoints: [
    '/api/vehicles/count',
    '/api/users',
    '/api/jobs'
  ]
};

console.log('🏥 Cleanup Tracker Health Check');
console.log('================================\n');

// Check if .env exists
const envPath = path.join(__dirname, 'cleanup-tracker-app', 'server', '.env');
const envExists = fs.existsSync(envPath);
console.log(`📄 .env file: ${envExists ? '✅ Found' : '❌ Missing'}`);

if (envExists) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const jwtSecret = envContent.match(/JWT_SECRET=(.+)/)?.[1]?.trim();
  const mongoUri = envContent.match(/MONGO_URI=(.+)/)?.[1]?.trim();
  
  console.log(`🔑 JWT_SECRET: ${jwtSecret && jwtSecret !== 'your-super-secret-jwt-key-change-this-in-production' ? '✅ Configured' : '❌ Not set or using default'}`);
  console.log(`🗄️  MONGO_URI: ${mongoUri ? '✅ Configured' : '⚠️  Using in-memory database'}`);
}

console.log('\n🌐 Server Health Checks:');

// Function to check endpoint
function checkEndpoint(url) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    const startTime = Date.now();
    
    const req = protocol.get(url, { timeout: CONFIG.timeout }, (res) => {
      const responseTime = Date.now() - startTime;
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          url,
          status: res.statusCode,
          responseTime,
          success: res.statusCode >= 200 && res.statusCode < 300,
          data: data.substring(0, 100)
        });
      });
    });
    
    req.on('error', (error) => {
      resolve({
        url,
        status: 0,
        responseTime: Date.now() - startTime,
        success: false,
        error: error.message
      });
    });
    
    req.on('timeout', () => {
      req.destroy();
      resolve({
        url,
        status: 0,
        responseTime: CONFIG.timeout,
        success: false,
        error: 'Timeout'
      });
    });
  });
}

// Run health checks
(async () => {
  for (const endpoint of CONFIG.endpoints) {
    const fullUrl = `${CONFIG.serverUrl}${endpoint}`;
    const result = await checkEndpoint(fullUrl);
    
    const status = result.success ? '✅' : '❌';
    const timing = `(${result.responseTime}ms)`;
    
    console.log(`${status} ${endpoint} ${timing}`);
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
  }
  
  console.log('\n📊 Summary:');
  console.log(`Server URL: ${CONFIG.serverUrl}`);
  console.log('');
  console.log('💡 Troubleshooting:');
  console.log('   - Ensure server is running: npm run start:prod');
  console.log('   - Check logs: pm2 logs cleanup-tracker');
  console.log('   - Verify MongoDB connection');
  console.log('   - Check firewall rules');
})();
