const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');

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
