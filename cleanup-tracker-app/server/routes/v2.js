const express = require('express');
const router = express.Router();
const V2User = require('../models/V2User');
const Job = require('../models/Job');
const Vehicle = require('../models/Vehicle');
const axios = require('axios');
const csv = require('csv-parser');
const mongoose = require('mongoose');

// Simple key-value Settings in-memory (fallback) with optional Mongo storage
const settingsStore = new Map();

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

// Diagnostic endpoints
router.get('/diag', async (req, res) => {
  const users = await V2User.find();
  res.json({ 
    message: 'V2 API active',
    users: users.map(u => ({ id: u._id, name: u.name, pin: u.pin, role: u.role, employeeNumber: u.employeeNumber }))
  });
});

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
    console.error('Reports error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Settings minimal API used by client
router.get('/settings', async (req, res) => {
  const siteTitle = settingsStore.get('siteTitle') || 'Cleanup Tracker';
  const inventoryCsvUrl = settingsStore.get('inventoryCsvUrl') || process.env.INVENTORY_CSV_URL || '';
  res.json({ siteTitle, inventoryCsvUrl });
});

router.put('/settings', async (req, res) => {
  const { key, value } = req.body || {};
  if (!key) return res.status(400).json({ error: 'key required' });
  settingsStore.set(key, value);
  res.json({ ok: true });
});

// Enhanced auth supporting PIN or employee number for all roles
router.post('/auth/login', async (req, res) => {
  const { employeeId } = req.body || {};
  if (!employeeId) return res.status(400).json({ error: 'employeeId required' });
  
  // Find user by PIN or employee number
  const user = await V2User.findOne({ 
    $or: [
      { pin: employeeId }, 
      { employeeNumber: employeeId },
      { username: employeeId }
    ] 
  });
  
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  res.json({ 
    user: { 
      id: String(user._id), 
      name: user.name, 
      role: user.role, 
      pin: user.pin,
      employeeNumber: user.employeeNumber,
      phoneNumber: user.phoneNumber
    } 
  });
});

// Seed initial users if none
router.post('/seed-users', async (req, res) => {
  try {
    const count = await V2User.countDocuments();
    if (count > 0) return res.json({ seeded: false, count });
    await V2User.insertMany([
      { username: 'manager', name: 'Joe Gallant', role: 'manager', password: 'password', pin: '1701', employeeNumber: 'MGR001', phoneNumber: '555-0001' },
      { pin: '1716', name: 'Alfred', role: 'detailer', uid: 'detailer-001', employeeNumber: 'DET001', phoneNumber: '555-0002' },
      { pin: '1709', name: 'Brian', role: 'detailer', uid: 'detailer-002', employeeNumber: 'DET002', phoneNumber: '555-0003' },
      { pin: '2001', name: 'Sarah Johnson', role: 'salesperson', employeeNumber: 'SALES001', phoneNumber: '555-0101' },
      { pin: '2002', name: 'Mike Chen', role: 'salesperson', employeeNumber: 'SALES002', phoneNumber: '555-0102' },
      { pin: '2003', name: 'Lisa Rodriguez', role: 'salesperson', employeeNumber: 'SALES003', phoneNumber: '555-0103' }
    ]);
    res.json({ seeded: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Users
router.get('/users', async (req, res) => {
  const users = await V2User.find();
  res.json(users.map(u => ({ ...u.toObject(), id: String(u._id) })));
});

router.post('/users', async (req, res) => {
  const { name, pin } = req.body;
  if (!name || !pin) return res.status(400).json({ error: 'name and pin are required' });
  const exists = await V2User.findOne({ pin, role: 'detailer' });
  if (exists) return res.status(409).json({ error: 'PIN already in use' });
  const user = await V2User.create({ name, pin, role: 'detailer', uid: `detailer-${Date.now()}` });
  res.status(201).json({ ...user.toObject(), id: String(user._id) });
});

router.put('/users/:id', async (req, res) => {
  const { name, pin } = req.body;
  const id = req.params.id;
  const exists = await V2User.findOne({ pin, role: 'detailer', _id: { $ne: id } });
  if (exists) return res.status(409).json({ error: 'PIN already in use' });
  const user = await V2User.findByIdAndUpdate(id, { name, pin }, { new: true });
  if (!user) return res.status(404).json({ error: 'Not found' });
  res.json({ ...user.toObject(), id: String(user._id) });
});

router.delete('/users/:id', async (req, res) => {
  await V2User.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

// Jobs
router.get('/jobs', async (req, res) => {
  const jobs = await Job.find().sort({ startTime: -1 });
  res.json(jobs.map(j => ({ ...j.toObject(), id: String(j._id) })));
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
    res.status(201).json({ ...job.toObject(), id: String(job._id) });
  } catch (error) {
    console.error('Job creation error:', error);
    res.status(400).json({ error: error.message || 'Failed to create job' });
  }
});

router.put('/jobs/:id/complete', async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  const end = new Date();
  // Calculate duration in minutes (not milliseconds)
  let totalDuration = 0;
  if (job.duration) {
    totalDuration = job.duration;
  } else if (job.startTime) {
    totalDuration = Math.round((end.getTime() - job.startTime.getTime()) / (1000 * 60));
    // Subtract any paused time
    if (job.pausedAt && job.resumedAt) {
      const pausedDuration = Math.round((job.resumedAt.getTime() - job.pausedAt.getTime()) / (1000 * 60));
      totalDuration -= pausedDuration;
    }
  }
  
  job.status = job.qcRequired ? 'QC Required' : 'Completed';
  job.endTime = end;
  job.completedAt = end;
  job.duration = totalDuration;
  await job.save();
  res.json({ ...job.toObject(), id: String(job._id) });
});

// Pause job
router.put('/jobs/:id/pause', async (req, res) => {
  const { reason } = req.body;
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  
  job.status = 'Paused';
  job.pausedAt = new Date();
  job.pauseReason = reason || 'Paused by user';
  await job.save();
  res.json({ ...job.toObject(), id: String(job._id) });
});

// Resume job
router.put('/jobs/:id/resume', async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  
  job.status = 'In Progress';
  job.resumedAt = new Date();
  await job.save();
  res.json({ ...job.toObject(), id: String(job._id) });
});

// Add technician to job
router.put('/jobs/:id/add-technician', async (req, res) => {
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
  res.json({ ...job.toObject(), id: String(job._id) });
});

// Complete QC
router.put('/jobs/:id/qc-complete', async (req, res) => {
  const { employeeNumber, qcNotes } = req.body;
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  
  const qcUser = await V2User.findOne({ employeeNumber });
  if (!qcUser || !['salesperson', 'manager'].includes(qcUser.role)) {
    return res.status(403).json({ error: 'Only salespeople or managers can complete QC' });
  }
  
  job.status = 'QC Approved';
  job.qcCompletedBy = qcUser.name;
  job.qcCompletedAt = new Date();
  job.qcNotes = qcNotes || '';
  job.qcEmployeeNumber = employeeNumber;
  
  await job.save();
  res.json({ ...job.toObject(), id: String(job._id) });
});

// Communication endpoints
router.post('/jobs/:id/send-message', async (req, res) => {
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
  console.log('SMS would be sent:', {
    message,
    recipients: recipients.map(r => ({ name: r.name, phone: r.phoneNumber })),
    jobId: job._id,
    vin: job.vin
  });
  
  res.json({ 
    success: true, 
    message: 'Message queued for delivery',
    recipients: recipients.length,
    jobVin: job.vin
  });
});

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
  res.json({
    job: { ...job.toObject(), id: String(job._id) },
    events: [
      { type: 'created', timestamp: job.createdAt, userName: job.technicianName },
      { type: 'started', timestamp: job.startTime, userName: job.technicianName },
      ...(job.endTime ? [{ type: 'completed', timestamp: job.endTime, userName: job.technicianName }] : [])
    ]
  });
});

router.patch('/jobs/:id', async (req, res) => {
  const allowed = ['priority', 'salesPerson'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] != null) updates[k] = req.body[k]; });
  const job = await Job.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!job) return res.status(404).json({ error: 'Not found' });
  res.json({ ...job.toObject(), id: String(job._id) });
});

router.put('/jobs/:id/start', async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  job.startTime = job.startTime || new Date();
  job.status = 'In Progress';
  await job.save();
  res.json({ ...job.toObject(), id: String(job._id) });
});

router.put('/jobs/:id/stop', async (req, res) => {
  // Treat stop as a no-op for now (could add pause later)
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  res.json({ ...job.toObject(), id: String(job._id) });
});

router.put('/jobs/:id/join', async (req, res) => {
  const { userId } = req.body || {};
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  if (userId && !job.assignedTechnicianIds.includes(userId)) job.assignedTechnicianIds.push(userId);
  await job.save();
  res.json({ ...job.toObject(), id: String(job._id) });
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
    : { $or: [ { vin: rx }, { stockNumber: rx } ] };
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
    const user = await V2User.findById(userId);
    const desc = v ? (v.vehicle || `${v.year} ${v.make} ${v.model}`) : 'Vehicle';
    job = await Job.create({
      technicianId: userId || user?.pin || 'unknown',
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
      assignedTechnicianIds: userId ? [userId] : [],
      priority: 'Normal',
      salesPerson: ''
    });
  } else if (userId && !job.assignedTechnicianIds.includes(userId)) {
    job.assignedTechnicianIds.push(userId);
    // Also update technicianId if not set properly
    if (!job.technicianId || job.technicianId === 'unknown') {
      const user = await V2User.findById(userId);
      job.technicianId = user?.pin || userId;
      job.technicianName = user?.name || job.technicianName;
    }
    await job.save();
  }
  res.json({ ...job.toObject(), id: String(job._id) });
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
    console.error('Refresh inventory failed:', e);
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
