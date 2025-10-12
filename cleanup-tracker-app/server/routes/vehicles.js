const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const Vehicle = require('../models/Vehicle');

// @route   GET api/vehicles/vin/:vin
// @desc    Get vehicle by VIN
// @access  Public
router.get('/vin/:vin', async (req, res) => {
    try {
        const vehicle = await Vehicle.findOne({ vin: req.params.vin });

        if (!vehicle) {
            return res.status(404).json({
                error: 'Vehicle not found',
                message: 'No vehicle found with that VIN'
            });
        }

        res.json(vehicle);
    } catch (error) {
        console.error('Error fetching vehicle by VIN:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to fetch vehicle'
        });
    }
});

// @route   GET api/vehicles
// @desc    Get all vehicles
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { search, newUsed, make, limit = 100 } = req.query;

        let query = {};

        // Apply filters if provided
        if (search) {
            query.$or = [
                { vin: { $regex: search, $options: 'i' } },
                { stockNumber: { $regex: search, $options: 'i' } },
                { make: { $regex: search, $options: 'i' } },
                { model: { $regex: search, $options: 'i' } }
            ];
        }

        if (newUsed) {
            query.newUsed = newUsed;
        }

        if (make) {
            query.make = { $regex: make, $options: 'i' };
        }

        const vehicles = await Vehicle.find(query)
            .sort({ age: -1 })
            .limit(parseInt(limit));

        res.json(vehicles);
    } catch (error) {
        console.error('Error fetching vehicles:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to fetch vehicles'
        });
    }
});

// @route   POST api/vehicles/populate
// @desc    Populate database from CSV
// @access  Public (for initial setup, should be protected in production)
router.post('/populate', async (req, res) => {
    try {
        const filePath = path.join(__dirname, '..', 'data', 'inventory.csv');

        // Check if file exists
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'CSV file not found at expected location'
            });
        }

        // Map column indices to canonical keys
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

        // Helper functions to clean data
        const cleanInt = (v) => {
            if (v === undefined || v === null) return null;
            const n = parseInt(String(v).replace(/[^0-9-]/g, ''), 10);
            return Number.isNaN(n) ? null : n;
        };

        const cleanStr = (v) => (v === undefined || v === null) ? '' : String(v).trim();

        const cleanPrice = (v) => (v === undefined || v === null) ? '' : String(v).replace(/[^0-9.]/g, '').trim();

        const rows = [];
        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csv({
                    mapHeaders: ({ header, index }) => headerMap[index] || null
                }))
                .on('data', (row) => rows.push(row))
                .on('error', reject)
                .on('end', resolve);
        });

        if (!rows.length) {
            return res.status(400).json({
                success: false,
                message: 'CSV file is empty'
            });
        }

        // Prepare upsert operations
        const ops = rows
            .filter(r => cleanStr(r.vin))
            .map(r => {
                const doc = {
                    newUsed: cleanStr(r.newUsed),
                    stockNumber: cleanStr(r.stockNumber),
                    vehicle: cleanStr(r.vehicle),
                    year: cleanInt(r.year),
                    make: cleanStr(r.make),
                    model: cleanStr(r.model),
                    body: cleanStr(r.body),
                    drivetrain: cleanStr(r.drivetrain),
                    color: cleanStr(r.color),
                    odometer: cleanStr(r.odometer),
                    price: cleanPrice(r.price),
                    age: cleanInt(r.age),
                    vin: cleanStr(r.vin),
                    tags: cleanStr(r.tags),
                    status: cleanStr(r.status)
                };
                return {
                    updateOne: {
                        filter: { vin: doc.vin },
                        update: { $set: doc },
                        upsert: true
                    }
                };
            });

        if (!ops.length) {
            return res.status(400).json({
                success: false,
                message: 'No valid vehicles found in CSV'
            });
        }

        const result = await Vehicle.bulkWrite(ops, { ordered: false });
        const total = await Vehicle.countDocuments();

        res.json({
            success: true,
            message: 'Database populated successfully',
            upserted: result.upsertedCount || 0,
            modified: result.modifiedCount || 0,
            matched: result.matchedCount || 0,
            total
        });
    } catch (error) {
        console.error('Error populating database from CSV:', error);
        res.status(500).json({
            success: false,
            message: 'Error populating database',
            error: error.message
        });
    }
});

// @route   GET api/vehicles/count
// @desc    Get vehicle count
// @access  Public
router.get('/count', async (req, res) => {
    try {
        const total = await Vehicle.countDocuments();
        res.json({ total });
    } catch (error) {
        console.error('Error counting vehicles:', error);
        res.status(500).json({ error: error.message });
    }
});

// @route   GET api/vehicles/search
// @desc    Advanced vehicle search
// @access  Public
router.get('/search', async (req, res) => {
    try {
        const { q, type, minYear, maxYear, minPrice, maxPrice } = req.query;

        let query = {};

        if (q) {
            query.$text = { $search: q };
        }

        if (type) {
            query.newUsed = type;
        }

        if (minYear || maxYear) {
            query.year = {};
            if (minYear) query.year.$gte = parseInt(minYear);
            if (maxYear) query.year.$lte = parseInt(maxYear);
        }

        if (minPrice || maxPrice) {
            query.price = {};
            if (minPrice) query.price.$gte = minPrice;
            if (maxPrice) query.price.$lte = maxPrice;
        }

        const vehicles = await Vehicle.find(query).limit(100);
        res.json(vehicles);
    } catch (error) {
        console.error('Error searching vehicles:', error);
        res.status(500).json({
            error: 'Server error',
            message: 'Failed to search vehicles'
        });
    }
});

module.exports = router;
