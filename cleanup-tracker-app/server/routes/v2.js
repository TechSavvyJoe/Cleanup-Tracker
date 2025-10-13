const express = require('express');
const router = express.Router();
const V2User = require('../models/V2User');
const Job = require('../models/Job');
const Vehicle = require('../models/Vehicle');
const axios = require('axios');
const csv = require('csv-parser');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const logger = require('../logger');

// Simple key-value Settings in-memory (fallback) with optional Mongo storage
const settingsStore = new Map();

const {
  assertValidPin,
  PIN_MIN_LENGTH,
  PIN_MAX_LENGTH,
  LOCK_MAX_ATTEMPTS,
  LOCK_WINDOW_MINUTES,
  LOCK_DURATION_MINUTES
} = V2User;

const ACCESS_TOKEN_TTL = config.jwtAccessExpiration;
const REFRESH_TOKEN_TTL = config.jwtRefreshExpiration;
const ACCESS_TOKEN_SECRET = config.jwtAccessSecret;
const REFRESH_TOKEN_SECRET = config.jwtRefreshSecret;

if (!ACCESS_TOKEN_SECRET || !REFRESH_TOKEN_SECRET) {
  throw new Error('JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be configured');
}

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function generateTemporaryPin() {
  const length = Math.min(PIN_MAX_LENGTH, Math.max(PIN_MIN_LENGTH, 6));
  let pin = '';
  for (let i = 0; i < length; i += 1) {
    const digit = Math.floor(Math.random() * 10);
    if (i === 0 && digit === 0) {
      pin += '1';
    } else {
      pin += String(digit);
    }
  }
  return pin;
}

function sanitizeUser(userDoc, options = {}) {
  if (!userDoc) return null;
  const user = userDoc.toObject({ virtuals: true });
  delete user.pinHash;
  delete user.passwordHash;
  delete user._plainPin;
  delete user._plainPassword;
  delete user.pin;
  const hasPin = userDoc.hasPin?.() || Boolean(user.pinLength);
  const pinPreview =
    typeof user.pinLength === 'number' && user.pinLast4
      ? `${'*'.repeat(Math.max(0, user.pinLength - user.pinLast4.length))}${user.pinLast4}`
      : null;
  user.hasPin = hasPin;
  user.pinPreview = pinPreview || null;
  user.pinLast4 = user.pinLast4 || null;
  user.pinLength = user.pinLength || null;
  user.pinUpdatedAt = user.pinUpdatedAt || null;
  user.pinRequiresReset = Boolean(user.pinRequiresReset);
  user.failedLoginAttempts = user.failedLoginAttempts || 0;
  user.lastFailedLoginAt = user.lastFailedLoginAt || null;
  user.lockedUntil = user.lockedUntil || null;
  user.accountLocked = Boolean(userDoc.isAccountLocked?.());
  if (options.sessionPin) {
    user.sessionPin = String(options.sessionPin);
  } else {
    delete user.sessionPin;
  }
  user.id = String(user._id);
  delete user._id;
  delete user.__v;
  return user;
}

async function findUserByCredential(identifier) {
  if (!identifier) return null;
  const normalizedEmployee = String(identifier).toUpperCase();
  const normalizedUsername = String(identifier).toLowerCase();
  return V2User.findOne({
    $or: [
      { employeeNumber: normalizedEmployee },
      { username: normalizedUsername },
      { uid: identifier }
    ]
  }).select('+pinHash +pin +passwordHash');
}

async function findUserByPin(pin) {
  if (!pin) return null;
  let normalized;
  try {
    normalized = assertValidPin(pin);
  } catch (err) {
    return null;
  }
  const last4 = normalized.slice(-4);
  const candidates = await V2User.find({
    pinLength: normalized.length,
    pinLast4: last4,
    isActive: { $ne: false }
  }).select('+pinHash +pin');
  for (const candidate of candidates) {
    if (await candidate.verifyPin(pin)) {
      return candidate;
    }
  }
  return null;
}

async function isPinInUse(pin, excludeId) {
  if (!pin) return false;
  let normalized;
  try {
    normalized = assertValidPin(pin);
  } catch (err) {
    return false;
  }
  const query = {
    pinLength: normalized.length,
    pinLast4: normalized.slice(-4)
  };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  const candidates = await V2User.find(query).select('+pinHash +pin');
  for (const candidate of candidates) {
    if (await candidate.verifyPin(normalized)) {
      return true;
    }
  }
  return false;
}

function generateAccessToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL
  });
}

function generateRefreshToken(user) {
  return jwt.sign({ sub: String(user._id) }, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL
  });
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  try {
    const payload = jwt.verify(token, ACCESS_TOKEN_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function jobToResponse(jobDoc) {
  if (!jobDoc) return null;
  const job = jobDoc.toObject({ virtuals: true });
  job.id = String(job._id);
  delete job._id;
  delete job.__v;
  return job;
}

function computeJobDuration(job, endTime = new Date()) {
  if (!job.startTime) {
    return job.duration || 0;
  }
  const end = endTime || new Date();
  let duration = Math.round((end.getTime() - job.startTime.getTime()) / (1000 * 60));
  if (job.pauseDuration) {
    duration -= job.pauseDuration;
  }
  return Math.max(0, duration);
}

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'V2 API is running', timestamp: new Date().toISOString() });
});

// Service expectations configuration
const SERVICE_EXPECTATIONS = {
  'Cleanup': { duration: 45, description: 'Interior/exterior basic cleaning' },
  'Detail': { duration: 120, description: 'Full interior and exterior detailing' },
  'Delivery': { duration: 30, description: 'Final prep and delivery setup' },
  'Rewash': { duration: 20, description: 'Quick wash and rinse' },
  'Lot Car': { duration: 60, description: 'Lot positioning and prep' },
  'FCTP': { duration: 90, description: 'Ford Customer Trade Program prep' },
  'Touch-up': { duration: 30, description: 'Minor paint and interior touch-ups' }
};

// Get service expectations
router.get('/service-expectations', (req, res) => {
  res.json(SERVICE_EXPECTATIONS);
});

// Update existing jobs with vehicle details
router.post('/jobs/populate-vehicle-details', async (req, res) => {
  try {
    const jobs = await Job.find({
      $or: [
        { year: { $exists: false } },
        { year: null },
        { year: '' }
      ]
    });
    
    let updated = 0;
    for (const job of jobs) {
      if (job.vin) {
        const vehicle = await Vehicle.findOne({ vin: job.vin });
        if (vehicle) {
          job.year = vehicle.year || '';
          job.make = vehicle.make || '';
          job.model = vehicle.model || '';
          job.vehicleColor = vehicle.color || '';
          if (!job.salesPerson) job.salesPerson = '';
          if (!job.priority) job.priority = 'Normal';
          await job.save();
          updated++;
        }
      }
    }
    
    res.json({ 
      message: `Updated ${updated} jobs with vehicle details`,
      totalJobs: jobs.length 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Reports endpoint with proper time calculations
router.get('/reports', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build date filter
    let dateFilter = {};
    if (startDate || endDate) {
      dateFilter.date = {};
      if (startDate) dateFilter.date.$gte = startDate;
      if (endDate) dateFilter.date.$lte = endDate;
    }
    
    // Get all jobs for the period
    const allJobs = await Job.find(dateFilter).sort({ startTime: -1 });
    const completedJobs = allJobs.filter(job => job.status === 'Completed' && job.duration > 0);
    
    // Calculate period totals
    const periodTotal = allJobs.length;
    const completed = completedJobs.length;
    const completionRate = periodTotal > 0 ? Math.round((completed / periodTotal) * 100) : 0;
    
    // Calculate last 7 days (for comparison)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const last7Days = await Job.countDocuments({
      createdAt: { $gte: sevenDaysAgo }
    });
    
    // Calculate detailer performance
    const detailerStats = {};
    const serviceTypeStats = {};
    
    completedJobs.forEach(job => {
      // Detailer performance
      const techName = job.technicianName || 'Unknown';
      if (!detailerStats[techName]) {
        detailerStats[techName] = {
          name: techName,
          totalJobs: 0,
          totalTime: 0,
          minTime: Infinity,
          maxTime: 0,
          recentJobs: 0
        };
      }
      
      detailerStats[techName].totalJobs++;
      detailerStats[techName].totalTime += job.duration || 0;
      detailerStats[techName].minTime = Math.min(detailerStats[techName].minTime, job.duration || 0);
      detailerStats[techName].maxTime = Math.max(detailerStats[techName].maxTime, job.duration || 0);
      
      // Count recent jobs (last 7 days)
      const jobDate = new Date(job.createdAt || job.startTime);
      if (jobDate >= sevenDaysAgo) {
        detailerStats[techName].recentJobs++;
      }
      
      // Service type performance
      const serviceType = job.serviceType || 'Unknown';
      if (!serviceTypeStats[serviceType]) {
        serviceTypeStats[serviceType] = {
          jobs: 0,
          totalTime: 0,
          avgTime: 0,
          minTime: Infinity,
          maxTime: 0
        };
      }
      
      serviceTypeStats[serviceType].jobs++;
      serviceTypeStats[serviceType].totalTime += job.duration || 0;
      serviceTypeStats[serviceType].minTime = Math.min(serviceTypeStats[serviceType].minTime, job.duration || 0);
      serviceTypeStats[serviceType].maxTime = Math.max(serviceTypeStats[serviceType].maxTime, job.duration || 0);
    });
    
    // Format detailer performance with proper averages
    const detailerPerformance = Object.values(detailerStats).map(stat => ({
      name: stat.name,
      totalJobs: stat.totalJobs,
      avgTime: stat.totalJobs > 0 ? Math.round(stat.totalTime / stat.totalJobs) : 0,
      minTime: stat.minTime === Infinity ? 0 : stat.minTime,
      maxTime: stat.maxTime,
      recentJobs: stat.recentJobs
    }));
    
    // Format service type performance
    const serviceTypes = Object.entries(serviceTypeStats).map(([type, stat]) => ({
      name: type,
      jobs: stat.jobs,
      avgTime: stat.jobs > 0 ? Math.round(stat.totalTime / stat.jobs) : 0,
      minTime: stat.minTime === Infinity ? 0 : stat.minTime,
      maxTime: stat.maxTime
    }));
    
    // Calculate daily trends (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const recentJobs = await Job.find({
      createdAt: { $gte: thirtyDaysAgo }
    });
    
    const dailyTrends = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      const dayJobs = recentJobs.filter(job => {
        const jobDate = new Date(job.createdAt || job.startTime);
        return jobDate.toISOString().split('T')[0] === dateStr;
      });
      
      const dayCompleted = dayJobs.filter(job => job.status === 'Completed');
      const completionPct = dayJobs.length > 0 ? Math.round((dayCompleted.length / dayJobs.length) * 100) : 0;
      
      dailyTrends.push({
        date: dateStr,
        jobs: dayJobs.length,
        completed: dayCompleted.length,
        completionRate: completionPct
      });
    }
    
    res.json({
      periodTotal,
      completed,
      completionRate,
      last7Days,
      detailerPerformance,
      serviceTypes,
      dailyTrends
    });
  } catch (error) {
    req.log?.error({ err: error }, 'Reports error');
    res.status(500).json({ error: error.message });
  }
});

// Settings minimal API used by client
router.get('/settings', async (req, res) => {
  const siteTitle = settingsStore.get('siteTitle') || 'Cleanup Tracker';
  const inventoryCsvUrl = settingsStore.get('inventoryCsvUrl') || process.env.INVENTORY_CSV_URL || '';
  res.json({ siteTitle, inventoryCsvUrl });
});

// Enhanced auth supporting PIN or employee number for all roles
router.post('/auth/login', async (req, res) => {
  try {
    const { employeeId, pin } = req.body || {};
    const identifier = typeof employeeId === 'string' ? employeeId.trim() : '';
    const submittedPin = typeof pin === 'string' ? pin.trim() : identifier;

    if (!submittedPin) {
      return res.status(400).json({ error: 'PIN required' });
    }

    let normalizedPin;
    try {
      normalizedPin = assertValidPin(submittedPin);
    } catch (validationError) {
      return res.status(400).json({ error: validationError.message });
    }

    let user = null;
    const lockSettings = {
      maxAttempts: LOCK_MAX_ATTEMPTS,
      windowMinutes: LOCK_WINDOW_MINUTES,
      lockDurationMinutes: LOCK_DURATION_MINUTES
    };

    if (pin && identifier) {
      const candidate = await findUserByCredential(identifier);
      if (!candidate) {
        req.log?.warn({ identifier }, 'Login failed: unknown identifier');
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      if (candidate.isAccountLocked()) {
        req.log?.warn(
          { identifier, lockedUntil: candidate.lockedUntil },
          'Login attempt on locked account'
        );
        return res.status(423).json({
          error: 'Account locked',
          lockedUntil: candidate.lockedUntil,
          attemptsRemaining: 0,
          locked: true
        });
      }

      const pinValid = await candidate.verifyPin(normalizedPin);
      if (!pinValid) {
        const lockResult = candidate.recordFailedLogin(lockSettings);
        await candidate.save();
        req.log?.warn(
          {
            identifier,
            locked: lockResult.locked,
            attemptsRemaining: Math.max(0, lockResult.maxAttempts - lockResult.attempts)
          },
          'Invalid PIN submitted'
        );
        return res.status(lockResult.locked ? 423 : 401).json({
          error: lockResult.locked ? 'Account locked' : 'Invalid credentials',
          lockedUntil: lockResult.lockedUntil,
          attemptsRemaining: Math.max(0, lockResult.maxAttempts - lockResult.attempts),
          locked: lockResult.locked
        });
      }

      candidate.resetFailedLogin();
      user = candidate;
    } else {
      user = await findUserByPin(normalizedPin);
      if (!user) {
        req.log?.warn({ pin: normalizedPin.slice(-4) }, 'Login failed via PIN');
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      if (user.isAccountLocked()) {
        req.log?.warn(
          { userId: user.id, lockedUntil: user.lockedUntil },
          'Login attempt on locked account via PIN'
        );
        return res.status(423).json({
          error: 'Account locked',
          lockedUntil: user.lockedUntil,
          attemptsRemaining: 0,
          locked: true
        });
      }
      user.resetFailedLogin();
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'User is inactive' });
    }

    user.lastLogin = new Date();
    await user.save();

    const sanitizedUser = sanitizeUser(user, { sessionPin: normalizedPin });
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    const responsePayload = {
      user: sanitizedUser,
      tokens: {
        accessToken,
        refreshToken,
        accessTokenExpiresIn: ACCESS_TOKEN_TTL,
        refreshTokenExpiresIn: REFRESH_TOKEN_TTL
      }
    };
    if (user.isAccountLocked()) {
      responsePayload.user.accountLocked = true;
    }
    req.log?.info({ userId: user.id, role: user.role }, 'Login successful');
    res.json(responsePayload);
  } catch (error) {
    req.log?.error({ err: error }, 'Login error');
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json({ error: 'refreshToken required' });
  }

  try {
    const payload = jwt.verify(refreshToken, REFRESH_TOKEN_SECRET);
    const user = await V2User.findById(payload.sub);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    res.json({
      accessToken: generateAccessToken(user),
      refreshToken: generateRefreshToken(user),
      accessTokenExpiresIn: ACCESS_TOKEN_TTL,
      refreshTokenExpiresIn: REFRESH_TOKEN_TTL
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

// Seed initial users if none
router.post('/seed-users', async (req, res) => {
  try {
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_V2_SEED !== 'true') {
      return res.status(403).json({ error: 'Seeding disabled in production' });
    }

    const count = await V2User.countDocuments();
    if (count > 0) {
      return res.json({ seeded: false, count });
    }

    const seedUsers = [
      { username: 'manager', name: 'Joe Gallant', role: 'manager', password: 'password', pin: '1701', employeeNumber: 'MGR001', phoneNumber: '555-0001' },
      { pin: '1716', name: 'Alfred', role: 'detailer', uid: 'detailer-001', employeeNumber: 'DET001', phoneNumber: '555-0002' },
      { pin: '1709', name: 'Brian', role: 'detailer', uid: 'detailer-002', employeeNumber: 'DET002', phoneNumber: '555-0003' },
      { pin: '2001', name: 'Sarah Johnson', role: 'salesperson', employeeNumber: 'SALES001', phoneNumber: '555-0101' },
      { pin: '2002', name: 'Mike Chen', role: 'salesperson', employeeNumber: 'SALES002', phoneNumber: '555-0102' },
      { pin: '2003', name: 'Lisa Rodriguez', role: 'salesperson', employeeNumber: 'SALES003', phoneNumber: '555-0103' }
    ];

    for (const seed of seedUsers) {
      const { pin: seedPin, password, username, ...rest } = seed;
      const user = new V2User({
        ...rest,
        username: username ? username.toLowerCase() : undefined
      });
      if (seedPin) await user.setPin(seedPin);
      if (password) await user.setPassword(password);
      await user.save();
    }

    const newCount = await V2User.countDocuments();
    res.json({ seeded: true, count: newCount });
  } catch (error) {
    logger.error({ err: error }, 'Seed users error');
    res.status(500).json({ error: error.message });
  }
});

router.use(authenticateToken);

// Diagnostic endpoints (secured)
router.get('/diag', async (req, res) => {
  const users = await V2User.find();
  res.json({
    message: 'V2 API active',
    users: users.map(sanitizeUser)
  });
});

router.put('/settings', async (req, res) => {
  const { key, value } = req.body || {};
  if (!key) return res.status(400).json({ error: 'key required' });
  settingsStore.set(key, value);
  res.json({ ok: true });
});

// Users
router.get('/users', async (req, res) => {
  const users = await V2User.find();
  res.json(users.map(sanitizeUser));
});

router.post('/users', async (req, res) => {
  const { name, pin, role = 'detailer', employeeNumber, phoneNumber, department, uid } = req.body || {};
  if (!name || !pin) {
    return res.status(400).json({ error: 'name and pin are required' });
  }

  if (await isPinInUse(pin)) {
    return res.status(409).json({ error: 'PIN already in use' });
  }

  const user = new V2User({
    name: name.trim(),
    role,
    employeeNumber: employeeNumber ? String(employeeNumber).toUpperCase() : undefined,
    phoneNumber,
    department,
    uid: uid || (role === 'detailer' ? `detailer-${Date.now()}` : undefined)
  });

  try {
    await user.setPin(pin);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  try {
    await user.save();
  } catch (err) {
    req.log?.error({ err }, 'Create user failed');
    return res.status(500).json({ error: 'Failed to create user' });
  }

  res.status(201).json(sanitizeUser(user));
});

router.put('/users/:id', async (req, res) => {
  const { name, pin, employeeNumber, phoneNumber, department, role, isActive } = req.body || {};
  const { id } = req.params;

  const user = await V2User.findById(id);
  if (!user) {
    logger.warn({ userId: id }, 'User update attempted on missing user');
    return res.status(404).json({ error: 'Not found' });
  }

  if (pin) {
    if (await isPinInUse(pin, id)) {
      return res.status(409).json({ error: 'PIN already in use' });
    }
    try {
      await user.setPin(pin);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  if (name !== undefined) user.name = name;
  if (employeeNumber !== undefined) {
    user.employeeNumber = employeeNumber ? String(employeeNumber).toUpperCase() : undefined;
  }
  if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
  if (department !== undefined) user.department = department;
  if (role !== undefined) user.role = role;
  if (typeof isActive === 'boolean') user.isActive = isActive;

  try {
    await user.save();
  } catch (err) {
    req.log?.error({ err }, 'Update user failed');
    return res.status(500).json({ error: 'Failed to update user' });
  }
  res.json(sanitizeUser(user));
});

router.post('/users/:id/reset-pin', async (req, res) => {
  const actingUserId = req.user?.sub;
  if (!actingUserId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const actingUser = await V2User.findById(actingUserId);
  if (!actingUser || actingUser.role !== 'manager') {
    return res.status(403).json({ error: 'Only managers may reset PINs' });
  }

  const user = await V2User.findById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'Not found' });
  }

  const requestedPin = typeof req.body?.newPin === 'string' ? req.body.newPin.trim() : '';
  const pinToSet = requestedPin || generateTemporaryPin();

  try {
    await user.setPin(pinToSet, { forceReset: true });
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }

  user.resetFailedLogin();
  await user.save();

  res.json({
    user: sanitizeUser(user),
    temporaryPin: pinToSet,
    autogenerated: !requestedPin
  });
});

router.post('/users/:id/unlock', async (req, res) => {
  const actingUserId = req.user?.sub;
  if (!actingUserId) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const actingUser = await V2User.findById(actingUserId);
  if (!actingUser || actingUser.role !== 'manager') {
    return res.status(403).json({ error: 'Only managers may unlock accounts' });
  }

  const user = await V2User.findById(req.params.id);
  if (!user) {
    logger.warn({ userId: req.params.id }, 'Unlock attempted for missing user');
    return res.status(404).json({ error: 'Not found' });
  }

  user.resetFailedLogin();
  await user.save();

  req.log?.info({ userId: user.id }, 'User account unlocked');
  res.json(sanitizeUser(user));
});

router.delete('/users/:id', async (req, res) => {
  await V2User.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

// Jobs
router.get('/jobs', async (req, res) => {
  const jobs = await Job.find().sort({ startTime: -1 });
  res.json(jobs.map(jobToResponse));
});

router.post('/jobs', async (req, res) => {
  try {
    const {
      technicianId, technicianName, vin, stockNumber, vehicleDescription,
      serviceType, date, salesPerson, assignedTechnicianIds, priority,
      year, make, model, vehicleColor
    } = req.body;

    const jobData = {
      technicianId: technicianId || 'unknown',
      technicianName: technicianName || 'Unknown Technician',
      vin: vin || 'UNKNOWN_VIN',
      stockNumber: stockNumber || '',
      vehicleDescription: vehicleDescription || 'Unknown Vehicle',
      serviceType: serviceType || 'Cleanup',
      date: date || new Date().toISOString().split('T')[0],
      status: 'In Progress',
      startTime: new Date(),
      expectedDuration: 60,
      qcRequired: false,
      salesPerson: salesPerson || '',
      assignedTechnicianIds: assignedTechnicianIds || [technicianId || 'unknown'],
      priority: priority || 'Normal',
      year: year || '',
      make: make || '',
      model: model || '',
      vehicleColor: vehicleColor || '',
      activeTechnicians: [{
        technicianId: technicianId || 'unknown',
        technicianName: technicianName || 'Unknown Technician',
        startTime: new Date()
      }]
    };

    const job = await Job.create(jobData);
    res.status(201).json(jobToResponse(job));
  } catch (error) {
    req.log?.error({ err: error }, 'Job creation error');
    res.status(400).json({ error: error.message || 'Failed to create job' });
  }
});

router.put('/jobs/:id/complete', async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  const end = new Date();

  job.status = job.qcRequired ? 'QC Required' : 'Completed';
  job.qcRequired = job.status === 'QC Required';
  job.endTime = end;
  job.completedAt = end;
  job.duration = computeJobDuration(job, end);
  await job.save();
  res.json(jobToResponse(job));
});

async function handlePauseJob(req, res) {
  const { reason } = req.body;
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  
  job.status = 'Paused';
  job.pausedAt = new Date();
  job.pauseReason = reason || 'Paused by user';
  await job.save();
  res.json(jobToResponse(job));
}

// Pause job
router.put('/jobs/:id/pause', handlePauseJob);
router.post('/jobs/:id/pause', handlePauseJob);

// Resume job
router.put('/jobs/:id/resume', async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  
  job.status = 'In Progress';
  job.resumedAt = new Date();
  await job.save();
  res.json(jobToResponse(job));
});

async function handleAddTechnician(req, res) {
  const { technicianId } = req.body;
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  
  const technician = await V2User.findById(technicianId);
  if (!technician) return res.status(404).json({ error: 'Technician not found' });
  
  if (!job.assignedTechnicianIds.includes(technicianId)) {
    job.assignedTechnicianIds.push(technicianId);
  }
  
  job.activeTechnicians.push({
    technicianId,
    technicianName: technician.name,
    startTime: new Date()
  });
  
  await job.save();
  res.json(jobToResponse(job));
}

// Add technician to job
router.put('/jobs/:id/add-technician', handleAddTechnician);
router.post('/jobs/:id/add-technician', handleAddTechnician);

router.put('/jobs/:id/status', async (req, res) => {
  const { status, qcNotes, pauseReason } = req.body || {};
  if (!status || typeof status !== 'string') {
    return res.status(400).json({ error: 'status required' });
  }

  const normalizedStatus = status.trim();
  const allowedStatuses = new Set([
    'Pending',
    'In Progress',
    'Paused',
    'Completed',
    'QC Required',
    'QC Approved',
    'Cancelled'
  ]);

  if (!allowedStatuses.has(normalizedStatus)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  const job = await Job.findById(req.params.id);
  if (!job) {
    return res.status(404).json({ error: 'Not found' });
  }

  const now = new Date();

  switch (normalizedStatus) {
    case 'Pending':
      job.status = 'Pending';
      break;
    case 'In Progress': {
      if (job.pausedAt) {
        const pausedMinutes = Math.max(0, Math.round((now.getTime() - job.pausedAt.getTime()) / (1000 * 60)));
        job.pauseDuration = (job.pauseDuration || 0) + pausedMinutes;
        job.pausedAt = undefined;
        job.pauseReason = undefined;
      }
      job.status = 'In Progress';
      job.startTime = job.startTime || now;
      job.resumedAt = now;
      job.qcRequired = false;
      break;
    }
    case 'Paused':
      job.status = 'Paused';
      job.pausedAt = now;
      job.pauseReason = pauseReason || 'Paused by user';
      job.resumedAt = undefined;
      job.qcRequired = false;
      break;
    case 'QC Required':
      job.status = 'QC Required';
      job.qcRequired = true;
      job.endTime = job.endTime || now;
      job.completedAt = job.completedAt || now;
      job.duration = computeJobDuration(job, job.endTime);
      break;
    case 'Completed':
      job.status = 'Completed';
      job.qcRequired = false;
      job.endTime = now;
      job.completedAt = now;
      job.duration = computeJobDuration(job, now);
      break;
    case 'QC Approved':
      job.status = 'QC Approved';
      job.qcRequired = false;
      job.endTime = now;
      job.completedAt = now;
      job.duration = computeJobDuration(job, now);
      break;
    case 'Cancelled':
      job.status = 'Cancelled';
      job.qcRequired = false;
      job.endTime = now;
      job.completedAt = now;
      break;
    default:
      break;
  }

  if (qcNotes !== undefined) {
    job.qcNotes = qcNotes;
  }

  await job.save();
  res.json(jobToResponse(job));
});

async function handleQcCompletion(req, res) {
  try {
    const { employeeNumber, qcNotes, qcPassed, qcCheckerId } = req.body || {};
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({ error: 'Not found' });
    }

    let qcUser = null;
    if (employeeNumber) {
      qcUser = await V2User.findOne({ employeeNumber: String(employeeNumber).toUpperCase() });
    }
    if (!qcUser && qcCheckerId) {
      qcUser =
        (await findUserByCredential(qcCheckerId)) ||
        (await V2User.findById(qcCheckerId));
    }
    if (!qcUser && req.user?.sub) {
      qcUser = await V2User.findById(req.user.sub);
    }

    if (!qcUser || !['salesperson', 'manager'].includes(qcUser.role)) {
      return res.status(403).json({ error: 'Only salespeople or managers can complete QC' });
    }

    const approved = qcPassed !== false;
    const now = new Date();

    if (approved) {
      job.status = 'QC Approved';
      job.qcRequired = false;
      job.endTime = job.endTime || now;
      job.completedAt = job.completedAt || now;
      if (job.startTime) {
        let duration = Math.round((job.endTime.getTime() - job.startTime.getTime()) / (1000 * 60));
        if (job.pauseDuration) {
          duration -= job.pauseDuration;
        }
        job.duration = Math.max(0, duration);
      }
    } else {
      job.status = 'QC Required';
      job.qcRequired = true;
    }

    job.qcCompletedBy = qcUser.name;
    job.qcCompletedAt = now;
    job.qcNotes = qcNotes || '';
    job.qcEmployeeNumber = qcUser.employeeNumber;

    await job.save();
    res.json(jobToResponse(job));
  } catch (error) {
    req.log?.error({ err: error }, 'QC completion error');
    res.status(500).json({ error: error.message });
  }
}

// Complete QC
router.put('/jobs/:id/qc-complete', handleQcCompletion);
router.post('/jobs/:id/qc', handleQcCompletion);

// Communication endpoints
async function handleSendMessage(req, res) {
  const { message, recipientType } = req.body; // recipientType: 'salesperson' | 'detailer'
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  
  let recipients = [];
  
  if (recipientType === 'salesperson' && job.salesPerson) {
    const salesUser = await V2User.findOne({ name: job.salesPerson, role: 'salesperson' });
    if (salesUser) recipients.push(salesUser);
  } else if (recipientType === 'detailer') {
    const detailers = await V2User.find({ 
      _id: { $in: job.assignedTechnicianIds },
      role: 'detailer' 
    });
    recipients = detailers;
  }
  
  // In a real implementation, integrate with SMS service like Twilio
  // For now, we'll just log the message and return success
  logger.info(
    {
      message,
      recipients: recipients.map((recipient) => ({ name: recipient.name, phone: recipient.phoneNumber })),
      jobId: job._id,
      vin: job.vin
    },
    'Simulated SMS dispatch'
  );
  
  res.json({ 
    success: true, 
    message: 'Message queued for delivery',
    recipients: recipients.length,
    jobVin: job.vin
  });
}

router.post('/jobs/:id/send-message', handleSendMessage);
router.post('/jobs/:id/message', handleSendMessage);

// Get job communications
router.get('/jobs/:id/messages', async (req, res) => {
  // In future, retrieve message history from database
  res.json({ messages: [] });
});

// Additional job endpoints used by client UI
router.get('/jobs/:id', async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  // Minimal details/events structure expected by UI
  const jobPayload = jobToResponse(job);
  res.json({
    job: jobPayload,
    events: [
      { type: 'created', timestamp: jobPayload.createdAt, userName: jobPayload.technicianName },
      { type: 'started', timestamp: jobPayload.startTime, userName: jobPayload.technicianName },
      ...(jobPayload.endTime ? [{ type: 'completed', timestamp: jobPayload.endTime, userName: jobPayload.technicianName }] : [])
    ]
  });
});

router.patch('/jobs/:id', async (req, res) => {
  const allowed = ['priority', 'salesPerson'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] != null) updates[k] = req.body[k]; });
  const job = await Job.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!job) return res.status(404).json({ error: 'Not found' });
  res.json(jobToResponse(job));
});

router.put('/jobs/:id/start', async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  job.startTime = job.startTime || new Date();
  job.status = 'In Progress';
  await job.save();
  res.json(jobToResponse(job));
});

router.put('/jobs/:id/stop', async (req, res) => {
  // Treat stop as a no-op for now (could add pause later)
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  res.json(jobToResponse(job));
});

router.put('/jobs/:id/join', async (req, res) => {
  const { userId } = req.body || {};
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  if (userId && !job.assignedTechnicianIds.includes(userId)) job.assignedTechnicianIds.push(userId);
  await job.save();
  res.json(jobToResponse(job));
});

// Vehicles search
router.get('/vehicles/search', async (req, res) => {
  const term = (req.query.q || '').trim();
  if (!term) return res.json([]);
  const rx = new RegExp(escapeRegex(term), 'i'); // partial, case-insensitive
  // Also support searching by last 6 of VIN if user enters that
  const last6 = term.length === 6 ? new RegExp(escapeRegex(term) + '$', 'i') : null;
  const query = last6
    ? { $or: [ { vin: last6 }, { stockNumber: rx } ] }
    : { $or: [ { vin: rx }, { stockNumber: rx }, { make: rx }, { model: rx }, { vehicle: rx } ] };
  const results = await Vehicle.find(query).limit(10);
  res.json(results.map(v => ({
    vin: v.vin,
    stockNumber: v.stockNumber,
    vehicleDescription: v.vehicle || `${v.year} ${v.make} ${v.model}`,
    year: v.year || '',
    make: v.make || '',
    model: v.model || '',
    color: v.color || ''
  })));
});

// Join by VIN: find latest in-progress job for VIN or create a new one
router.put('/vehicles/join-by-vin', async (req, res) => {
  const { vin, userId } = req.body || {};
  if (!vin) return res.status(400).json({ error: 'vin required' });
  let job = await Job.findOne({ vin, status: 'In Progress' }).sort({ createdAt: -1 });
  if (!job) {
    // try to find vehicle to prefill description/stock and user info
    const v = await Vehicle.findOne({ vin });
    const user = userId ? await V2User.findById(userId) : null;
    const desc = v ? (v.vehicle || `${v.year} ${v.make} ${v.model}`) : 'Vehicle';
    const resolvedTechnicianId = user ? String(user._id) : (userId ? String(userId) : 'unknown');
    job = await Job.create({
      technicianId: resolvedTechnicianId,
      technicianName: user?.name || 'Detailer',
      vin,
      stockNumber: v?.stockNumber || 'N/A',
      vehicleDescription: desc,
      // Add vehicle details from inventory
      year: v?.year || null,
      make: v?.make || '',
      model: v?.model || '',
      vehicleColor: v?.color || '',
      serviceType: 'Cleanup',
      startTime: new Date(),
      status: 'In Progress',
      date: new Date().toISOString().slice(0,10),
      assignedTechnicianIds: resolvedTechnicianId && resolvedTechnicianId !== 'unknown' ? [resolvedTechnicianId] : [],
      priority: 'Normal',
      salesPerson: ''
    });
  } else if (userId) {
    const normalizedUserId = String(userId);
    if (!Array.isArray(job.assignedTechnicianIds)) {
      job.assignedTechnicianIds = [];
    }
    if (!job.assignedTechnicianIds.includes(normalizedUserId)) {
      job.assignedTechnicianIds.push(normalizedUserId);
    }
    // Also update technicianId if not set properly
    if (!job.technicianId || job.technicianId === 'unknown') {
      const user = await V2User.findById(userId);
      job.technicianId = user ? String(user._id) : normalizedUserId;
      job.technicianName = user?.name || job.technicianName;
    }
    await job.save();
  }
  res.json(jobToResponse(job));
});

// Manually refresh inventory from Google Sheets CSV
router.post('/vehicles/refresh', async (req, res) => {
  try {
    const SHEET_URL = process.env.INVENTORY_CSV_URL || 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSTW7Nwrbbl3Lp7R3RlKfSx-cd1tAffBzTINNOrCnaU1wp3kA7av63Y5Af8Jn4ATMDB09XcIAO_wodU/pub?output=csv';
    const response = await axios.get(SHEET_URL, { responseType: 'stream' });
    const headerMap = { 0:'newUsed',1:'stockNumber',2:'vehicle',3:'year',4:'make',5:'model',6:'body',7:'drivetrain',8:'color',9:'odometer',10:'price',11:'age',12:'vin',13:'tags',14:'status' };
    const rows = [];
    await new Promise((resolve, reject) => {
      response.data
        .pipe(csv({ mapHeaders: ({ header, index }) => headerMap[index] || null }))
        .on('data', (row) => rows.push(row))
        .on('error', reject)
        .on('end', resolve);
    });
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
    if (!ops.length) return res.status(400).json({ success: false, message: 'No VIN rows found.' });
    const result = await Vehicle.bulkWrite(ops, { ordered: false });
    const total = await Vehicle.countDocuments();
    res.json({ success: true, upserted: result.upsertedCount || 0, modified: result.modifiedCount || 0, total });
  } catch (e) {
    req.log?.error({ err: e }, 'Refresh inventory failed');
    res.status(500).json({ success: false, message: e.message });
  }
});

// Allow setting CSV URL via API for future imports
router.post('/vehicles/set-csv', (req, res) => {
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: 'url required' });
  settingsStore.set('inventoryCsvUrl', url);
  process.env.INVENTORY_CSV_URL = url;
  res.json({ ok: true });
});

module.exports = router;
