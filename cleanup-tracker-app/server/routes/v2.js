const express = require('express');
const router = express.Router();
const V2User = require('../models/V2User');
const Job = require('../models/Job');
const Vehicle = require('../models/Vehicle');

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
  const u = term.toUpperCase();
  const results = await Vehicle.find({ $or: [ { vin: u }, { stockNumber: u } ] }).limit(5);
  // massage fields for v2 component naming
  res.json(results.map(v => ({
    vin: v.vin,
    stockNumber: v.stockNumber,
    vehicleDescription: v.vehicle || `${v.year} ${v.make} ${v.model}`
  })));
});

module.exports = router;
