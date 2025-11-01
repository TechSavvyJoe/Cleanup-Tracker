
const express = require('express');
const router = express.Router();
const Job = require('../../models/Job');
const V2User = require('../../models/V2User');
const {
  jobToResponse,
  computeJobDuration
} = require('../../utils/jobs');

// Update existing jobs with vehicle details
router.post('/populate-vehicle-details', async (req, res) => {
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

// Jobs
router.get('/', async (req, res) => {
  try {
    const jobs = await Job.find().sort({ startTime: -1 });
    res.json(jobs.map(jobToResponse));
  } catch (error) {
    console.error('Failed to fetch jobs:', error);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

router.post('/', async (req, res) => {
  try {
    const {
      technicianId, technicianName, vin, stockNumber, vehicleDescription,
      serviceType, date, salesPerson, assignedTechnicianIds, priority,
      year, make, model, vehicleColor
    } = req.body;

    // Parse date - handle string dates like "2025-01-15" or Date objects
    let jobDate;
    if (date) {
      jobDate = typeof date === 'string' ? new Date(date) : new Date(date);
      // If date is invalid, use today
      if (isNaN(jobDate.getTime())) {
        jobDate = new Date();
      }
    } else {
      jobDate = new Date();
    }

    const jobData = {
      technicianId: technicianId || 'unknown',
      technicianName: technicianName || 'Unknown Technician',
      vin: vin || 'UNKNOWN_VIN',
      stockNumber: stockNumber || '',
      vehicleDescription: vehicleDescription || 'Unknown Vehicle',
      serviceType: serviceType || 'Cleanup',
      date: jobDate,
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
    console.error('Job creation error:', error);
    res.status(400).json({ error: error.message || 'Failed to create job' });
  }
});

router.put('/:id/complete', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });
    const end = new Date();

    job.status = job.qcRequired ? 'QC Required' : 'Completed';
    job.qcRequired = job.status === 'QC Required';
    job.endTime = end;
    job.completedAt = end;
    job.duration = computeJobDuration(job, end);
    await job.save();
    res.json(jobToResponse(job));
  } catch (error) {
    console.error('Failed to complete job:', error);
    res.status(500).json({ error: 'Failed to complete job' });
  }
});

async function handlePauseJob(req, res) {
  try {
    const { reason } = req.body;
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    job.status = 'Paused';
    job.pausedAt = new Date();
    job.pauseReason = reason || 'Paused by user';
    await job.save();
    res.json(jobToResponse(job));
  } catch (error) {
    console.error('Failed to pause job:', error);
    res.status(500).json({ error: 'Failed to pause job' });
  }
}

// Pause job
router.put('/:id/pause', handlePauseJob);
router.post('/:id/pause', handlePauseJob);

// Resume job
router.put('/:id/resume', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

    job.status = 'In Progress';
    job.resumedAt = new Date();
    await job.save();
    res.json(jobToResponse(job));
  } catch (error) {
    console.error('Failed to resume job:', error);
    res.status(500).json({ error: 'Failed to resume job' });
  }
});

async function handleAddTechnician(req, res) {
  try {
    const { technicianId } = req.body;
    if (!technicianId) {
      return res.status(400).json({ error: 'technicianId required' });
    }

    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: 'Job not found' });

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
  } catch (error) {
    console.error('Failed to add technician to job:', error);
    res.status(500).json({ error: 'Failed to add technician' });
  }
}

// Add technician to job
router.put('/:id/add-technician', handleAddTechnician);
router.post('/:id/add-technician', handleAddTechnician);

router.put('/:id/status', async (req, res) => {
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
    console.error('QC completion error:', error);
    res.status(500).json({ error: error.message });
  }
}

// Complete QC
router.put('/:id/qc-complete', handleQcCompletion);
router.post('/:id/qc', handleQcCompletion);

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
}

router.post('/:id/send-message', handleSendMessage);
router.post('/:id/message', handleSendMessage);

// Get job communications
router.get('/:id/messages', async (req, res) => {
  // In future, retrieve message history from database
  res.json({ messages: [] });
});

// Additional job endpoints used by client UI
router.get('/:id', async (req, res) => {
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

router.patch('/:id', async (req, res) => {
  const allowed = ['priority', 'salesPerson'];
  const updates = {};
  allowed.forEach(k => { if (req.body[k] != null) updates[k] = req.body[k]; });
  const job = await Job.findByIdAndUpdate(req.params.id, updates, { new: true });
  if (!job) return res.status(404).json({ error: 'Not found' });
  res.json(jobToResponse(job));
});

router.put('/:id/start', async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  job.startTime = job.startTime || new Date();
  job.status = 'In Progress';
  await job.save();
  res.json(jobToResponse(job));
});

router.put('/:id/stop', async (req, res) => {
  // Treat stop as a no-op for now (could add pause later)
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  res.json(jobToResponse(job));
});

router.put('/:id/join', async (req, res) => {
  const { userId } = req.body || {};
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: 'Not found' });
  if (userId && !job.assignedTechnicianIds.includes(userId)) job.assignedTechnicianIds.push(userId);
  await job.save();
  res.json(jobToResponse(job));
});

module.exports = router;
