require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const axios = require('axios');
const Vehicle = require('./models/Vehicle');

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json());

// DB Config
const configDb = require('./config/keys').mongoURI;

// Connect to MongoDB with fallback to in-memory server
async function connectDb() {
  try {
    await mongoose.connect(configDb, { useNewUrlParser: true, useUnifiedTopology: true, serverSelectionTimeoutMS: 3000 });
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
      const mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverSelectionTimeoutMS: 3000 });
      console.log('Connected to in-memory MongoDB');
    } catch (memErr) {
      console.error('Failed to start in-memory MongoDB:', memErr);
      process.exit(1);
    }
  }
}

// Ensure DB is connected before starting the HTTP server
async function main() {
  await connectDb();
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

// Use Routes
app.use('/api/vehicles', require('./routes/vehicles'));
app.use('/api/users', require('./routes/users'));
app.use('/api/cleanups', require('./routes/cleanups'));
app.use('/api/v2', require('./routes/v2'));

// Serve static assets if in production
if (process.env.NODE_ENV === 'production') {
  // Serve client build from ../client/build relative to server directory
  const clientBuildPath = path.resolve(__dirname, '..', 'client', 'build');
  app.use(express.static(clientBuildPath));

  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

const fs = require('fs');

// Try to listen on process.env.PORT or default 5051, increment on conflict
let startPort = parseInt(process.env.PORT, 10) || 5051;
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
  const ops = rows.filter(r => cleanStr(r.vin)).map(r => {
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
