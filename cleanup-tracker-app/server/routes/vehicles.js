const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const Vehicle = require('../models/Vehicle');

// @route   GET api/vehicles/vin/:vin
// @desc    Get vehicle by VIN
// @access  Public
router.get('/vin/:vin', (req, res) => {
    Vehicle.findOne({ vin: req.params.vin })
        .then(vehicle => {
            if (!vehicle) {
                return res.status(404).json({ novvehiclefound: 'No vehicle found with that VIN' });
            }
            res.json(vehicle);
        })
        .catch(err => res.status(404).json({ novvehiclefound: 'No vehicle found with that VIN' }));
});

// @route   GET api/vehicles
// @desc    Get all vehicles
// @access  Public
router.get('/', (req, res) => {
    Vehicle.find()
        .sort({ age: -1 })
        .then(vehicles => res.json(vehicles))
        .catch(err => res.status(404).json({ novehiclesfound: 'No vehicles found' }));
});


// @route   POST api/vehicles/populate
// @desc    Populate database from CSV
// @access  Public (for initial setup, should be protected in a real app)
router.post('/populate', async (req, res) => {
    const filePath = path.join(__dirname, '..', 'data', 'inventory.csv');

    // Map column indices to canonical keys to handle duplicate headers (e.g., "Body") and BOMs
    const headerMap = {
        0: 'newUsed',
        1: 'stockNumber',
        2: 'vehicle',
        3: 'year',
        4: 'make',
        5: 'model',
        6: 'body',
        7: 'drivetrain', // was "Drivetrain\nType"
        8: 'color',      // second "Body" column is actually color
        9: 'odometer',
        10: 'price',
        11: 'age',
        12: 'vin',
        13: 'tags',
        14: 'status'
    };

    const cleanInt = (v) => {
        if (v === undefined || v === null) return null;
        const n = parseInt(String(v).replace(/[^0-9-]/g, ''), 10);
        return Number.isNaN(n) ? null : n;
    };
    const cleanStr = (v) => (v === undefined || v === null) ? '' : String(v).trim();
    const cleanPrice = (v) => (v === undefined || v === null) ? '' : String(v).replace(/[^0-9.]/g, '').trim();

    try {
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
            return res.status(400).json({ success: false, message: 'CSV parsed but contained no rows.' });
        }

        // Prepare upsert operations keyed by VIN to avoid duplicate key errors
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
            return res.status(400).json({ success: false, message: 'No valid VIN rows found to import.' });
        }

        const result = await Vehicle.bulkWrite(ops, { ordered: false });
        const total = await Vehicle.countDocuments();
        res.json({
            success: true,
            message: 'Database populated successfully.',
            upserted: result.upsertedCount || 0,
            modified: result.modifiedCount || 0,
            matched: result.matchedCount || 0,
            total
        });
    } catch (err) {
        console.error('Error populating database from CSV:', err);
        res.status(500).json({ success: false, message: 'Error populating database.', error: err.message || String(err) });
    }
});

// Quick count endpoint for diagnostics
router.get('/count', async (req, res) => {
    try {
        const total = await Vehicle.countDocuments();
        res.json({ total });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

module.exports = router;
