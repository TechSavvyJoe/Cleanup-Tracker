
const express = require('express');
const router = express.Router();
const Vehicle = require('../../models/Vehicle');
const Job = require('../../models/Job');
const V2User = require('../../models/V2User');
const {
  jobToResponse
} = require('../../utils/jobs');
const {
  escapeRegex
} = require('../../utils/helpers');

// Vehicles search
router.get('/search', async (req, res) => {
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

// Vehicles list (inventory) with optional filters and pagination
router.get('/', async (req, res) => {
  try {
    const {
      q = '',
      status = '',
      sortBy = 'updatedAt',
      order = 'desc',
      page = '1',
      limit = '100'
    } = req.query || {};

    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const perPage = Math.min(Math.max(parseInt(limit, 10) || 100, 1), 500);
    const skip = (pageNum - 1) * perPage;

    const find = {};
    if (q && String(q).trim()) {
      const term = String(q).trim();
      const rx = new RegExp(escapeRegex(term), 'i');
      const last6 = term.length === 6 ? new RegExp(escapeRegex(term) + '$', 'i') : null;
      Object.assign(find, last6
        ? { $or: [{ vin: last6 }, { stockNumber: rx }] }
        : { $or: [{ vin: rx }, { stockNumber: rx }, { make: rx }, { model: rx }, { vehicle: rx }] }
      );
    }
    if (status && String(status).trim() && String(status).toLowerCase() !== 'all') {
      find.status = status;
    }

    const sortDir = String(order).toLowerCase() === 'asc' ? 1 : -1;
    const sort = { [sortBy]: sortDir };

    const [total, vehicles] = await Promise.all([
      Vehicle.countDocuments(find),
      Vehicle.find(find).sort(sort).skip(skip).limit(perPage)
    ]);

    res.json({ success: true, vehicles, total, page: pageNum, limit: perPage });
  } catch (e) {
    console.error('List vehicles failed:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// Join by VIN: find latest in-progress job for VIN or create a new one
router.put('/join-by-vin', async (req, res) => {
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
  res.json(jobToResponse(job));
});

// Manually refresh inventory from Google Sheets CSV
router.post('/refresh', async (req, res) => {
  try {
    await fetchAndImportInventory();
    res.json({ success: true, message: 'Inventory refresh started.' });
  } catch (e) {
    console.error('Refresh inventory failed:', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// Allow setting CSV URL via API for future imports
router.post('/set-csv', async (req, res) => {
  const { url } = req.body || {};
  if (!url) return res.status(400).json({ error: 'url required' });
  try {
    const normalized = await setInventoryCsvUrl(url);
    res.json({ ok: true, url: normalized });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

module.exports = router;
