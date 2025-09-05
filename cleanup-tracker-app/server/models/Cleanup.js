const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CleanupSchema = new Schema({
    vehicle: { type: Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    cleanupType: { type: String, enum: ['Cleanup', 'Detail', 'Delivery', 'Rewash', 'Lot Car', 'FCTP'], required: true },
    startTime: { type: Date, required: true },
    endTime: { type: Date },
    duration: { type: Number } // in minutes
});

module.exports = mongoose.model('Cleanup', CleanupSchema);
