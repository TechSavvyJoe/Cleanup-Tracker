const express = require('express');
const router = express.Router();
const V2User = require('../models/V2User');
const Job = require('../models/Job');
const Vehicle = require('../models/Vehicle');
const axios = require('axios');
const csv = require('csv-parser');

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Seed initial users if none
router.post('/seed-users', async (req, res) => {
  try {
    const count = await V2User.countDocuments();
    if (count > 0) return res.json({ seeded: false, count });
    await V2User.insertMany([
      { username: 'manager', name: 'Joe Gallant', role: 'manager', password: 'password' },
      { pin: '1716', name: 'Alfred', role: 'detailer', uid: 'detailer-001' },
      { pin: '1709', name: 'Brian', role: 'detailer', uid: 'detailer-002' }
    ]);
    res.json({ seeded: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Users
router.get('/users', async (req, res) => {
  const users = await V2User.find();
  res.json(users);
});

router.post('/users', async (req, res) => {
  const { name, pin } = req.body;
  if (!name || !pin) return res.status(400).json({ error: 'name and pin are required' });
  const exists = await V2User.findOne({ pin, role: 'detailer' });
  if (exists) return res.status(409).json({ error: 'PIN already in use' });
  const user = await V2User.create({ name, pin, role: 'detailer', uid: `detailer-${Date.now()}` });
  res.status(201).json(user);
});

router.put('/users/:id', async (req, res) => {
  const { name, pin } = req.body;
  const id = req.params.id;
  const exists = await V2User.findOne({ pin, role: 'detailer', _id: { $ne: id } });
  if (exists) return res.status(409).json({ error: 'PIN already in use' });
  const user = await V2User.findByIdAndUpdate(id, { name, pin }, { new: true });
  res.json(user);
});

router.delete('/users/:id', async (req, res) => {
  await V2User.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

// Jobs
router.get('/jobs', async (req, res) => {
  const jobs = await Job.find().sort({ startTime: -1 });
  res.json(jobs);
});

router.post('/jobs', async (req, res) => {
  const { technicianId, technicianName, vin, stockNumber, vehicleDescription, serviceType, date } = req.body;
  const job = await Job.create({
    technicianId, technicianName, vin, stockNumber, vehicleDescription, serviceType,
    startTime: new Date(), endTime: null, duration: null, status: 'In Progress', date
  });
  res.status(201).json(job);
});

router.put('/jobs/:id/complete', async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  const end = new Date();
  const duration = job.startTime ? (end.getTime() - job.startTime.getTime()) : 0;
  job.status = 'Completed';
  job.endTime = end;
  job.duration = duration;
  await job.save();
  res.json(job);
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
    vehicleDescription: v.vehicle || `${v.year} ${v.make} ${v.model}`
  })));
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

module.exports = router;
