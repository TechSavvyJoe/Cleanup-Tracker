const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const VehicleSchema = new Schema({
    newUsed: {
        type: String,
        required: true,
        enum: ['New', 'Used', 'Certified'],
        index: true
    },
    stockNumber: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    vehicle: {
        type: String,
        required: true
    },
    year: {
        type: Number,
        required: true,
        min: 1900,
        max: 2100,
        index: true
    },
    make: {
        type: String,
        required: true,
        index: true
    },
    model: {
        type: String,
        required: true,
        index: true
    },
    body: {
        type: String
    },
    drivetrain: {
        type: String
    },
    color: {
        type: String
    },
    odometer: {
        type: String,
        required: true
    },
    price: {
        type: String,
        required: true
    },
    age: {
        type: Number,
        required: true,
        min: 0
    },
    vin: {
        type: String,
        required: true,
        unique: true,
        index: true,
        uppercase: true,
        trim: true
    },
    tags: {
        type: String
    },
    status: {
        type: String,
        default: 'Available'
    },
    lastCleaned: {
        type: Date,
        index: true
    }
}, {
    timestamps: true
});

// Compound indexes for common queries
VehicleSchema.index({ make: 1, model: 1 });
VehicleSchema.index({ newUsed: 1, age: -1 });
VehicleSchema.index({ status: 1, lastCleaned: -1 });

// Text index for search
VehicleSchema.index({
    vin: 'text',
    stockNumber: 'text',
    make: 'text',
    model: 'text',
    vehicle: 'text'
});

module.exports = mongoose.model('Vehicle', VehicleSchema);
