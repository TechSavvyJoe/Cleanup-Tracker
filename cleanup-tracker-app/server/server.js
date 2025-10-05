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

const app = express();

// Security and performance middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      imgSrc: ["'self'", "data:", "https:"],
      fontSrc: ["'self'", "data:"]
    }
  }
}));

app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // limit each IP to 100 requests per windowMs in production
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 15 * 60 * 1000
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Apply rate limiting to API routes (disabled in development for testing)
if (process.env.NODE_ENV === 'production') {
  app.use('/api/', limiter);
}

// Auth endpoints need stricter rate limiting
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 50, // limit each IP to 5 login attempts per 15 minutes in production
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: 15 * 60 * 1000
  }
});

// Apply auth rate limiting only in production
if (process.env.NODE_ENV === 'production') {
  app.use('/api/users/login', authLimiter);
  app.use('/api/users/register', authLimiter);
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
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

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

// Serve static assets (both dev and prod)
const clientBuildPath = path.resolve(__dirname, '..', 'client', 'build');
app.use(express.static(clientBuildPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

const fs = require('fs');

// Try to listen on process.env.PORT or default 5051, increment on conflict
let startPort = parseInt(process.env.PORT, 10) || 5051;

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
  await V2User.insertMany(defaultUsers);
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
const maxPort = startPort + 100;

function startServer(portToTry) {
  const serverInstance = app.listen(portToTry, () => {
    console.log(`Server started on port ${portToTry}`);
    // write chosen port to a file so the client starter can read it
    try {
      fs.writeFileSync(path.join(__dirname, '.port'), String(portToTry));
    } catch (e) {
      console.error('Failed to write .port file:', e);
    }
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

// Process and move the CSV file
const csv = require('csv-parser');

const csvFilePath = '../../Sales Person Used Inventory List-Mission Ford of Dearborn-2025-09-03-0404.csv';
const newCsvFilePath = path.join(__dirname, 'data', 'inventory.csv');

fs.rename(csvFilePath, newCsvFilePath, (err) => {
  if (err) {
    // If the file doesn't exist in the root, it might already be in the data folder
    if (err.code === 'ENOENT') {
      // Silent when file not present; nothing to move
      return;
    }
    return console.error('Error moving CSV file:', err);
  }
  console.log('CSV file moved to data folder');
});

// Import Google Sheets inventory CSV at startup
async function fetchAndImportInventory() {
  const SHEET_URL = process.env.INVENTORY_CSV_URL || 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSTW7Nwrbbl3Lp7R3RlKfSx-cd1tAffBzTINNOrCnaU1wp3kA7av63Y5Af8Jn4ATMDB09XcIAO_wodU/pub?output=csv';
  console.log('Fetching inventory CSV...');
  const response = await axios.get(SHEET_URL, { responseType: 'stream' });
  const headerMap = {
    0: 'newUsed', 1: 'stockNumber', 2: 'vehicle', 3: 'year', 4: 'make', 5: 'model',
    6: 'body', 7: 'drivetrain', 8: 'color', 9: 'odometer', 10: 'price', 11: 'age', 12: 'vin', 13: 'tags', 14: 'status'
  };
  const rows = [];
  await new Promise((resolve, reject) => {
    response.data
      .pipe(csv({ mapHeaders: ({ header, index }) => headerMap[index] || null }))
      .on('data', (row) => rows.push(row))
      .on('error', reject)
      .on('end', resolve);
  });
  if (!rows.length) { console.warn('Inventory CSV empty.'); return; }
  const cleanInt = (v) => { const n = parseInt(String(v || '').replace(/[^0-9-]/g, ''), 10); return Number.isNaN(n) ? null : n; };
  const cleanStr = (v) => (v == null ? '' : String(v).trim());
  const cleanPrice = (v) => (v == null ? '' : String(v).replace(/[^0-9.]/g, '').trim());
  const ops = rows.filter(r => cleanStr(r.vin) && cleanStr(r.stockNumber)).map(r => {
    const doc = {
      newUsed: cleanStr(r.newUsed), stockNumber: cleanStr(r.stockNumber), vehicle: cleanStr(r.vehicle),
      year: cleanInt(r.year), make: cleanStr(r.make), model: cleanStr(r.model), body: cleanStr(r.body),
      drivetrain: cleanStr(r.drivetrain), color: cleanStr(r.color), odometer: cleanStr(r.odometer), price: cleanPrice(r.price),
      age: cleanInt(r.age), vin: cleanStr(r.vin), tags: cleanStr(r.tags), status: cleanStr(r.status)
    };
    return { updateOne: { filter: { vin: doc.vin }, update: { $set: doc }, upsert: true } };
  });
  if (!ops.length) { console.warn('No VIN rows found in inventory CSV.'); return; }
  const result = await Vehicle.bulkWrite(ops, { ordered: false });
  const total = await Vehicle.countDocuments();
  console.log(`Inventory import done. upserted=${result.upsertedCount || 0}, modified=${result.modifiedCount || 0}, total=${total}`);
}
