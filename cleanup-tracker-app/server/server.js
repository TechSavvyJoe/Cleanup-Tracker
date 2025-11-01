require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const Vehicle = require('./models/Vehicle');
const { getInventoryCsvUrl } = require('./utils/inventorySource');

const app = express();
const isProduction = process.env.NODE_ENV === 'production';
const RATE_LIMIT_MAX = parseInt(process.env.RATE_LIMIT_MAX || '', 10) || (isProduction ? 100 : 1000);
const AUTH_RATE_LIMIT_MAX = parseInt(process.env.AUTH_RATE_LIMIT_MAX || '', 10) || (isProduction ? 5 : 50);
const UPLOAD_LIMIT = process.env.UPLOAD_LIMIT || '10mb';

// Security and performance middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "data:"]
    }
  }
}));

app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: RATE_LIMIT_MAX,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 15 * 60 * 1000
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting to API routes (disabled in development for testing)
if (isProduction) {
  app.use('/api/', limiter);
}

// Auth endpoints need stricter rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: AUTH_RATE_LIMIT_MAX,
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: 15 * 60 * 1000
  }
});

// Apply auth rate limiting only in production
if (isProduction) {
  app.use('/api/users/login', authLimiter);
  app.use('/api/users/register', authLimiter);
  app.use('/api/v2/auth/login', authLimiter);
}

// CORS configuration
const corsOptions = {
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : false)
    : ['http://localhost:3000', 'http://127.0.0.1:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json({ limit: UPLOAD_LIMIT }));
app.use(bodyParser.urlencoded({ extended: true, limit: UPLOAD_LIMIT }));

// Request logging middleware
const requestLogger = require('./middleware/requestLogger');
app.use(requestLogger);

// DB Config
const configDb = require('./config/keys').mongoURI;

// Connect to MongoDB with fallback to in-memory server
async function connectDb() {
  try {
    await mongoose.connect(configDb, { serverSelectionTimeoutMS: 3000 });
    console.log('MongoDB Connected');
  } catch (err) {
    if (process.env.NODE_ENV === 'production') {
      console.error('MongoDB connection failed in production. Set MONGO_URI env. Error:', err.message);
      process.exit(1);
    }
    console.warn('Local MongoDB not available, starting in-memory MongoDB. Error:', err.message);
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      console.log('Spinning up in-memory MongoDB instance...');
      const mongod = await MongoMemoryServer.create({
        instance: {
          dbName: 'cleanup-tracker',
          storageEngine: 'wiredTiger'
        },
        binary: {
          downloadDir: path.join(__dirname, 'mongodb-binaries')
        }
      });
      const uri = mongod.getUri();
      await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
      console.log('Connected to in-memory MongoDB');
    } catch (memErr) {
      console.error('Failed to start in-memory MongoDB:', memErr);
      process.exit(1);
    }
  }
}

// Health check endpoint for deployment platforms
app.get('/api/health', (req, res) => {
  const token = req.headers['x-health-check-token'];
  if (process.env.NODE_ENV === 'production' && token !== process.env.HEALTH_CHECK_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Use Routes
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/users', require('./routes/users'));
app.use('/api/cleanups', require('./routes/cleanups'));
app.use('/api/v2', require('./routes/v2'));

const fs = require('fs');

// Serve static assets (both dev and prod)
// In Docker production, server.js is in /app/, so client/build is at ./client/build
// In development, server.js is in /app/server/, so client/build is at ../client/build
const clientBuildPath = fs.existsSync(path.join(__dirname, 'client', 'build'))
  ? path.join(__dirname, 'client', 'build')
  : path.resolve(__dirname, '..', 'client', 'build');

console.log('Serving static files from:', clientBuildPath);

app.use(express.static(clientBuildPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

// Try to listen on process.env.PORT or default 5051, increment on conflict
let startPort = parseInt(process.env.PORT, 10) || 5051;
const maxPort = startPort + 100;

// Seed default users if none exist
async function seedUsersIfNeeded() {
  const V2User = require("./models/V2User");
  const count = await V2User.countDocuments();
  if (count > 0) {
    console.log(`Users already seeded (${count} users found)`);
    return;
  }
  console.log("No users found. Seeding default users...");
  const defaultUsers = [
    { name: "Joe Gallant", role: "manager", pin: "1701", employeeNumber: "MGR001", phoneNumber: "555-0001" },
    { name: "Alfred", role: "detailer", pin: "1716", uid: "detailer-001", employeeNumber: "DET001", phoneNumber: "555-0002" },
    { name: "Brian", role: "detailer", pin: "1709", uid: "detailer-002", employeeNumber: "DET002", phoneNumber: "555-0003" },
    { name: "Sarah Johnson", role: "salesperson", pin: "2001", employeeNumber: "SALES001", phoneNumber: "555-0101" },
    { name: "Mike Chen", role: "salesperson", pin: "2002", employeeNumber: "SALES002", phoneNumber: "555-0102" },
    { name: "Lisa Rodriguez", role: "salesperson", pin: "2003", employeeNumber: "SALES003", phoneNumber: "555-0103" }
  ];
  
  // Use save() instead of insertMany() to trigger pre-save hooks for PIN hashing
  for (const userData of defaultUsers) {
    const user = new V2User(userData);
    await user.save();
  }
  
  console.log(`Seeded ${defaultUsers.length} default users`);
}

// Ensure DB is connected before starting the HTTP server
async function main() {
  await connectDb();
  try {
    await seedUsersIfNeeded();
  } catch (e) {
    console.warn("User seeding failed:", e.message);
  }
  try {
    await fetchAndImportInventory();
  } catch (e) {
    console.warn('Inventory import skipped/failed:', e.message);
  }
  startServer(startPort);
}

main().catch(err => {
  console.error('Fatal startup error:', err);
  process.exit(1);
});

function startServer(portToTry) {
  const serverInstance = app.listen(portToTry, () => {
    console.log(`Server started on port ${portToTry}`);
    // Removed .port file writing as it causes permission errors in Docker
    // and is not necessary for the application to function
  });

  serverInstance.on('error', err => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${portToTry} in use, trying ${portToTry + 1}`);
      serverInstance.close?.();
      if (portToTry + 1 <= maxPort) {
        startServer(portToTry + 1);
      } else {
        console.error('No available ports found');
        process.exit(1);
      }
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });
}

// startServer is invoked from main() after DB connection

const { fetchAndImportInventory } = require('./utils/inventory');
