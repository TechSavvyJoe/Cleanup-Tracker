const express = require('express');
const router = express.Router();
const Cleanup = require('../models/Cleanup');
const Vehicle = require('../models/Vehicle');
const User = require('../models/User');

// @route   POST api/cleanups/start
// @desc    Start a new cleanup
// @access  Private
router.post('/start', async (req, res) => {
    try {
        const { vin, userId, cleanupType } = req.body;

        // Validation
        if (!vin || !userId || !cleanupType) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'VIN, userId, and cleanupType are required'
            });
        }

        // Find vehicle
        const vehicle = await Vehicle.findOne({ vin });
        if (!vehicle) {
            return res.status(404).json({
                error: 'Vehicle not found',
                message: 'No vehicle found with that VIN'
            });
        }

        // Verify user exists
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({
                error: 'User not found',
                message: 'Invalid user ID'
            });
        }

        // Check if there's already an active cleanup for this vehicle
        const existingCleanup = await Cleanup.findOne({
            vehicle: vehicle._id,
            endTime: { $exists: false }
        });

        if (existingCleanup) {
            return res.status(409).json({
                error: 'Cleanup in progress',
                message: 'This vehicle already has an active cleanup'
            });
        }

        // Create new cleanup
        const newCleanup = new Cleanup({
            vehicle: vehicle._id,
            user: userId,
            cleanupType,
            startTime: new Date()
        });

        const cleanup = await newCleanup.save();

        // Populate the response
        const populatedCleanup = await Cleanup.findById(cleanup._id)
            .populate('vehicle')
            .populate('user', 'username role');

        res.status(201).json(populatedCleanup);
    } catch (error) {
        console.error('Error starting cleanup:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to start cleanup'
        });
    }
});

// @route   POST api/cleanups/end/:id
// @desc    End a cleanup
// @access  Private
router.post('/end/:id', async (req, res) => {
    try {
        const cleanup = await Cleanup.findById(req.params.id);

        if (!cleanup) {
            return res.status(404).json({
                error: 'Cleanup not found',
                message: 'No cleanup found with that ID'
            });
        }

        // Check if already ended
        if (cleanup.endTime) {
            return res.status(400).json({
                error: 'Cleanup already ended',
                message: 'This cleanup has already been completed'
            });
        }

        // Calculate duration
        const endTime = new Date();
        const durationMs = endTime.getTime() - cleanup.startTime.getTime();
        const durationMinutes = Math.round(durationMs / 60000);

        cleanup.endTime = endTime;
        cleanup.duration = durationMinutes;

        await cleanup.save();

        // Update vehicle's lastCleaned timestamp
        const vehicle = await Vehicle.findById(cleanup.vehicle);
        if (vehicle) {
            vehicle.lastCleaned = endTime;
            await vehicle.save();
        }

        // Populate the response
        const populatedCleanup = await Cleanup.findById(cleanup._id)
            .populate('vehicle')
            .populate('user', 'username role');

        res.json(populatedCleanup);
    } catch (error) {
        console.error('Error ending cleanup:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to end cleanup'
        });
    }
});

// @route   GET api/cleanups
// @desc    Get all cleanups (with filtering)
// @access  Private
router.get('/', async (req, res) => {
    try {
        const { user, cleanupType, startDate, endDate, limit = 100 } = req.query;

        let filter = {};

        // Apply filters
        if (user) {
            filter.user = user;
        }

        if (cleanupType) {
            filter.cleanupType = cleanupType;
        }

        if (startDate || endDate) {
            filter.startTime = {};
            if (startDate) {
                filter.startTime.$gte = new Date(startDate);
            }
            if (endDate) {
                // Set end date to end of day
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                filter.startTime.$lte = end;
            }
        }

        const cleanups = await Cleanup.find(filter)
            .populate('vehicle')
            .populate('user', 'username role')
            .sort({ startTime: -1 })
            .limit(parseInt(limit));

        res.json(cleanups);
    } catch (error) {
        console.error('Error fetching cleanups:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to fetch cleanups'
        });
    }
});

// @route   GET api/cleanups/:id
// @desc    Get cleanup by ID
// @access  Private
router.get('/:id', async (req, res) => {
    try {
        const cleanup = await Cleanup.findById(req.params.id)
            .populate('vehicle')
            .populate('user', 'username role');

        if (!cleanup) {
            return res.status(404).json({
                error: 'Cleanup not found',
                message: 'No cleanup found with that ID'
            });
        }

        res.json(cleanup);
    } catch (error) {
        console.error('Error fetching cleanup:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to fetch cleanup'
        });
    }
});

// @route   GET api/cleanups/active/count
// @desc    Get count of active cleanups
// @access  Private
router.get('/active/count', async (req, res) => {
    try {
        const count = await Cleanup.countDocuments({
            endTime: { $exists: false }
        });

        res.json({ count });
    } catch (error) {
        console.error('Error counting active cleanups:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to count active cleanups'
        });
    }
});

// @route   DELETE api/cleanups/:id
// @desc    Delete a cleanup
// @access  Private
router.delete('/:id', async (req, res) => {
    try {
        const cleanup = await Cleanup.findById(req.params.id);

        if (!cleanup) {
            return res.status(404).json({
                error: 'Cleanup not found',
                message: 'No cleanup found with that ID'
            });
        }

        await cleanup.deleteOne();

        res.json({
            success: true,
            message: 'Cleanup deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting cleanup:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to delete cleanup'
        });
    }
});

module.exports = router;
