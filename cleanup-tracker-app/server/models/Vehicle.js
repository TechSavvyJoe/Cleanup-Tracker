const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const VehicleSchema = new Schema({
    newUsed: { type: String, required: true },
    stockNumber: { type: String, required: true, unique: true },
    vehicle: { type: String, required: true },
    year: { type: Number, required: true },
    make: { type: String, required: true },
    model: { type: String, required: true },
    body: { type: String },
    drivetrain: { type: String },
    color: { type: String },
    odometer: { type: String, required: true },
    price: { type: String, required: true },
    age: { type: Number, required: true },
    vin: { type: String, required: true, unique: true },
    tags: { type: String },
    status: { type: String },
    lastCleaned: { type: Date }
});

module.exports = mongoose.model('Vehicle', VehicleSchema);
