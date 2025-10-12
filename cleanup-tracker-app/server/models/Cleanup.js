const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CleanupSchema = new Schema({
    vehicle: {
        type: Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true,
        index: true
    },
    user: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    cleanupType: {
        type: String,
        enum: ['Cleanup', 'Detail', 'Delivery', 'Rewash', 'Lot Car', 'FCTP', 'Touch-up'],
        required: true,
        index: true
    },
    startTime: {
        type: Date,
        required: true,
        index: true
    },
    endTime: {
        type: Date,
        index: true
    },
    duration: {
        type: Number, // in minutes
        min: 0
    },
    notes: {
        type: String,
        maxlength: 1000
    },
    status: {
        type: String,
        enum: ['In Progress', 'Completed', 'Cancelled'],
        default: 'In Progress',
        index: true
    }
}, {
    timestamps: true
});

// Compound indexes for common queries
CleanupSchema.index({ vehicle: 1, endTime: -1 });
CleanupSchema.index({ user: 1, startTime: -1 });
CleanupSchema.index({ cleanupType: 1, startTime: -1 });
CleanupSchema.index({ status: 1, startTime: -1 });

// Virtual for duration calculation (if not saved)
CleanupSchema.virtual('calculatedDuration').get(function() {
    if (this.duration) return this.duration;
    if (this.endTime && this.startTime) {
        return Math.round((this.endTime - this.startTime) / (1000 * 60));
    }
    return null;
});

// Method to complete cleanup
CleanupSchema.methods.complete = function() {
    if (!this.endTime) {
        this.endTime = new Date();
        this.duration = Math.round((this.endTime - this.startTime) / (1000 * 60));
        this.status = 'Completed';
    }
    return this.save();
};

module.exports = mongoose.model('Cleanup', CleanupSchema);
