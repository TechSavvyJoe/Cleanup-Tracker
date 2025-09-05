const express = require('express');
const router = express.Router();
const Cleanup = require('../models/Cleanup');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');

// @route   POST api/cleanups/start
// @desc    Start a new cleanup
// @access  Private
router.post('/start', (req, res) => {
    const { vin, userId, cleanupType } = req.body;

    Vehicle.findOne({ vin }).then(vehicle => {
        if (!vehicle) {
            return res.status(404).json({ novvehiclefound: 'No vehicle found with that VIN' });
        }

        const newCleanup = new Cleanup({
            vehicle: vehicle._id,
            user: userId,
            cleanupType: cleanupType,
            startTime: new Date()
        });

        newCleanup.save()
            .then(cleanup => res.json(cleanup))
            .catch(err => res.status(400).json(err));
    });
});

// @route   POST api/cleanups/end/:id
// @desc    End a cleanup
// @access  Private
router.post('/end/:id', (req, res) => {
    Cleanup.findById(req.params.id).then(cleanup => {
        if (!cleanup) {
            return res.status(404).json({ nocleanupfound: 'No cleanup found' });
        }

        cleanup.endTime = new Date();
        const duration = (cleanup.endTime.getTime() - cleanup.startTime.getTime()) / 60000; // in minutes
        cleanup.duration = Math.round(duration);

        cleanup.save().then(cleanup => {
            Vehicle.findById(cleanup.vehicle).then(vehicle => {
                if (vehicle) {
                    vehicle.lastCleaned = cleanup.endTime;
                    vehicle.save();
                }
            });
            res.json(cleanup);
        });
    });
});

// @route   GET api/cleanups
// @desc    Get all cleanups (with filtering)
// @access  Private
router.get('/', (req, res) => {
    const { user, cleanupType, startDate, endDate } = req.query;
    let filter = {};

    if (user) filter.user = user;
    if (cleanupType) filter.cleanupType = cleanupType;
    if (startDate || endDate) {
        filter.startTime = {};
        if (startDate) filter.startTime.$gte = new Date(startDate);
        if (endDate) filter.startTime.$lte = new Date(endDate);
    }

    Cleanup.find(filter)
        .populate('vehicle')
        .populate('user', 'username')
        .sort({ startTime: -1 })
        .then(cleanups => res.json(cleanups))
        .catch(err => res.status(404).json({ nocleanupsfound: 'No cleanups found' }));
});

module.exports = router;
