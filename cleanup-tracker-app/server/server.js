require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const pinoHttp = require('pino-http');
const csv = require('csv-parser');

const Vehicle = require('./models/Vehicle');
const config = require('./config/env');
const logger = require('./logger');
const requestContext = require('./middleware/requestContext');

const app = express();

app.use(requestContext);
app.use(
  pinoHttp({
    logger,
    genReqId: (req) => req.id,
    customLogLevel(req, res, err) {
      if (err || res?.statusCode >= 500) return 'error';
      if (res?.statusCode >= 400) return 'warn';
      return 'info';
    },
    customSuccessMessage(req, res) {
      if (req && res) {
        return `${req.method} ${req.url} completed with ${res.statusCode}`;
      }
      return 'request completed';
    },
    customErrorMessage(req, res, err) {
      if (req && res) {
        return `${req.method} ${req.url} failed with ${res.statusCode}`;
      }
      return err?.message || 'request failed';
    }
  })
);

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        fontSrc: ["'self'", 'data:']
      }
    }
  })
);

app.use(compression());

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.rateLimitMax,
  message: {
    error: 'Too many requests from this IP, please try again later.',
    retryAfter: 15 * 60 * 1000
  },
  standardHeaders: true,
  legacyHeaders: false
});

if (config.isProduction) {
  app.use('/api/', limiter);
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.authRateLimitMax,
  message: {
    error: 'Too many authentication attempts, please try again later.',
    retryAfter: 15 * 60 * 1000
  }
});

if (config.isProduction) {
  app.use('/api/v2/auth/login', authLimiter);
}

const allowedOrigins = config.isProduction
  ? config.frontendUrls && config.frontendUrls.length
    ? config.frontendUrls
    : false
  : ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    optionsSuccessStatus: 200
  })
);

app.use(bodyParser.json({ limit: config.uploadLimit }));
app.use(bodyParser.urlencoded({ extended: true, limit: config.uploadLimit }));

async function connectDb() {
  try {
    await mongoose.connect(config.mongoUri, { serverSelectionTimeoutMS: 3000 });
    logger.info({ mongoUri: config.mongoUri }, 'MongoDB connected');
  } catch (err) {
    if (config.isProduction) {
      logger.error({ err }, 'MongoDB connection failed in production');
      throw err;
    }

    logger.warn({ err }, 'MongoDB unavailable, falling back to in-memory server');

    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      logger.info('Starting in-memory MongoDB instance');
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
      logger.info('Connected to in-memory MongoDB');
    } catch (memoryErr) {
      logger.error({ err: memoryErr }, 'Failed to start in-memory MongoDB');
      throw memoryErr;
    }
  }
}

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv
  });
});

app.use('/api/v2', require('./routes/v2'));

const clientBuildPath = fs.existsSync(path.join(__dirname, 'client', 'build'))
  ? path.join(__dirname, 'client', 'build')
  : path.resolve(__dirname, '..', 'client', 'build');

logger.info({ clientBuildPath }, 'Serving static files');

app.use(express.static(clientBuildPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(clientBuildPath, 'index.html'));
});

async function seedUsersIfNeeded() {
  const V2User = require('./models/V2User');
  const count = await V2User.countDocuments();
  if (count > 0) {
    logger.info({ count }, 'Users already seeded');
    return;
  }

  logger.warn('No users found. Seeding defaults...');
  const defaultUsers = [
    { name: 'Joe Gallant', role: 'manager', pin: '1701', employeeNumber: 'MGR001', phoneNumber: '555-0001' },
    { name: 'Alfred', role: 'detailer', pin: '1716', uid: 'detailer-001', employeeNumber: 'DET001', phoneNumber: '555-0002' },
    { name: 'Brian', role: 'detailer', pin: '1709', uid: 'detailer-002', employeeNumber: 'DET002', phoneNumber: '555-0003' },
    { name: 'Sarah Johnson', role: 'salesperson', pin: '2001', employeeNumber: 'SALES001', phoneNumber: '555-0101' },
    { name: 'Mike Chen', role: 'salesperson', pin: '2002', employeeNumber: 'SALES002', phoneNumber: '555-0102' },
    { name: 'Lisa Rodriguez', role: 'salesperson', pin: '2003', employeeNumber: 'SALES003', phoneNumber: '555-0103' }
  ];

  for (const seed of defaultUsers) {
    const { pin, password, ...rest } = seed;
    const user = new V2User(rest);
    if (pin) {
      await user.setPin(pin);
    }
    if (password) {
      await user.setPassword(password);
    }
    await user.save();
  }

  logger.info({ seeded: defaultUsers.length }, 'Default users seeded');
}

async function fetchAndImportInventory() {
  const sheetUrl =
    process.env.INVENTORY_CSV_URL ||
    'https://docs.google.com/spreadsheets/d/e/2PACX-1vSTW7Nwrbbl3Lp7R3RlKfSx-cd1tAffBzTINNOrCnaU1wp3kA7av63Y5Af8Jn4ATMDB09XcIAO_wodU/pub?output=csv';

  logger.info({ sheetUrl }, 'Fetching inventory CSV');
  const response = await axios.get(sheetUrl, { responseType: 'stream' });
  const headerMap = {
    0: 'newUsed',
    1: 'stockNumber',
    2: 'vehicle',
    3: 'year',
    4: 'make',
    5: 'model',
    6: 'body',
    7: 'drivetrain',
    8: 'color',
    9: 'odometer',
    10: 'price',
    11: 'age',
    12: 'vin',
    13: 'tags',
    14: 'status'
  };

  const rows = [];
  await new Promise((resolve, reject) => {
    response.data
      .pipe(csv({ mapHeaders: ({ index }) => headerMap[index] || null }))
      .on('data', (row) => rows.push(row))
      .on('error', reject)
      .on('end', resolve);
  });

  if (!rows.length) {
    logger.warn('Inventory CSV empty');
    return;
  }

  const cleanInt = (value) => {
    const parsed = parseInt(String(value || '').replace(/[^0-9-]/g, ''), 10);
    return Number.isNaN(parsed) ? null : parsed;
  };
  const cleanStr = (value) => (value == null ? '' : String(value).trim());
  const cleanPrice = (value) => (value == null ? '' : String(value).replace(/[^0-9.]/g, '').trim());

  const operations = rows
    .filter((row) => cleanStr(row.vin) && cleanStr(row.stockNumber))
    .map((row) => {
      const doc = {
        newUsed: cleanStr(row.newUsed),
        stockNumber: cleanStr(row.stockNumber),
        vehicle: cleanStr(row.vehicle),
        year: cleanInt(row.year),
        make: cleanStr(row.make),
        model: cleanStr(row.model),
        body: cleanStr(row.body),
        drivetrain: cleanStr(row.drivetrain),
        color: cleanStr(row.color),
        odometer: cleanStr(row.odometer),
        price: cleanPrice(row.price),
        age: cleanInt(row.age),
        vin: cleanStr(row.vin),
        tags: cleanStr(row.tags),
        status: cleanStr(row.status)
      };
      return { updateOne: { filter: { vin: doc.vin }, update: { $set: doc }, upsert: true } };
    });

  if (!operations.length) {
    logger.warn('Inventory CSV contained no VIN rows');
    return;
  }

  const result = await Vehicle.bulkWrite(operations, { ordered: false });
  const total = await Vehicle.countDocuments();
  logger.info(
    {
      upserted: result.upsertedCount || 0,
      modified: result.modifiedCount || 0,
      total
    },
    'Inventory import completed'
  );
}

const basePort = config.port;
const maxPort = basePort + 100;

function startServer(portToTry = basePort) {
  const serverInstance = app.listen(portToTry, () => {
    logger.info({ port: portToTry }, 'HTTP server started');
  });

  serverInstance.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      logger.warn({ port: portToTry }, 'Port in use, trying next port');
      serverInstance.close?.();
      if (portToTry + 1 <= maxPort) {
        startServer(portToTry + 1);
      } else {
        logger.error('No available ports found');
        process.exit(1);
      }
    } else {
      logger.error({ err }, 'Server error');
      process.exit(1);
    }
  });

  return serverInstance;
}

async function main() {
  await connectDb();
  try {
    await seedUsersIfNeeded();
  } catch (err) {
    logger.warn({ err }, 'User seeding failed');
  }
  try {
    await fetchAndImportInventory();
  } catch (err) {
    logger.warn({ err }, 'Inventory import skipped/failed');
  }
  startServer(basePort);
}

if (require.main === module) {
  main().catch((err) => {
    logger.error({ err }, 'Fatal startup error');
    process.exit(1);
  });
}

module.exports = {
  app,
  connectDb,
  startServer,
  main
};
