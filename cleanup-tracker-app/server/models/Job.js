const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const jobSchema = new mongoose.Schema({
    technicianId: {
        type: String,
        required: false,
        index: true
    },
    technicianName: {
        type: String,
        required: false
    },
    vin: {
        type: String,
        required: false,
        uppercase: true,
        trim: true,
        index: true
    },
    vehicleDescription: String,
    stockNumber: {
        type: String,
        index: true
    },
    serviceType: {
        type: String,
        index: true
    },
    startTime: {
        type: Date,
        index: true
    },
    endTime: Date,
    completedAt: Date,
    status: {
        type: String,
        default: 'Pending',
        enum: ['Pending', 'In Progress', 'Paused', 'Completed', 'QC Required', 'QC Approved', 'Cancelled'],
        index: true
    },
    issues: [String],
    duration: {
        type: Number, // in minutes
        min: 0
    },
    date: {
        type: String,
        index: true
    },
    priority: {
        type: String,
        default: 'Normal',
        enum: ['Low', 'Normal', 'High', 'Urgent'],
        index: true
    },
    salesPerson: String,
    assignedTechnicianIds: [String],

    // Vehicle details
    year: String,
    make: String,
    model: String,
    vehicleColor: String,

    // Enhanced features
    activeTechnicians: [{
        technicianId: String,
        technicianName: String,
        startTime: Date,
        endTime: Date
    }],
    pausedAt: Date,
    pauseReason: String,
    resumedAt: Date,
    expectedDuration: {
        type: Number,
        default: 60,
        min: 0
    }, // minutes
    qcRequired: {
        type: Boolean,
        default: false,
        index: true
    },
    qcCompletedBy: String,
    qcCompletedAt: Date,
    qcNotes: String,
    qcEmployeeNumber: String,

    // Additional tracking
    actualStartTime: Date,
    actualEndTime: Date,
    pauseDuration: {
        type: Number,
        default: 0,
        min: 0
    } // minutes spent paused
}, {
    timestamps: true
});

// Compound indexes for common queries
jobSchema.index({ technicianId: 1, status: 1 });
jobSchema.index({ status: 1, startTime: -1 });
jobSchema.index({ vin: 1, status: 1 });
jobSchema.index({ date: 1, status: 1 });
jobSchema.index({ serviceType: 1, status: 1 });
jobSchema.index({ priority: 1, status: 1, startTime: 1 });

// Virtual for duration calculation
jobSchema.virtual('durationMinutes').get(function() {
    if (this.duration) return this.duration;
    if (this.endTime && this.startTime) {
        let duration = Math.round((this.endTime - this.startTime) / (1000 * 60));
        // Subtract pause duration if applicable
        if (this.pauseDuration) {
            duration -= this.pauseDuration;
        }
        return Math.max(0, duration);
    }
    return 0;
});

// Virtual for checking if overdue
jobSchema.virtual('isOverdue').get(function() {
    if (this.status === 'Completed' || this.status === 'Cancelled') {
        return false;
    }
    if (!this.startTime || !this.expectedDuration) {
        return false;
    }
    const now = new Date();
    const expectedEnd = new Date(this.startTime.getTime() + this.expectedDuration * 60 * 1000);
    return now > expectedEnd;
});

// Method to pause job
jobSchema.methods.pause = function(reason) {
    if (this.status === 'In Progress') {
        this.status = 'Paused';
        this.pausedAt = new Date();
        this.pauseReason = reason || 'Paused by user';
    }
    return this.save();
};

// Method to resume job
jobSchema.methods.resume = function() {
    if (this.status === 'Paused' && this.pausedAt) {
        this.status = 'In Progress';
        this.resumedAt = new Date();
        // Calculate and add pause duration
        const pauseTime = Math.round((this.resumedAt - this.pausedAt) / (1000 * 60));
        this.pauseDuration = (this.pauseDuration || 0) + pauseTime;
    }
    return this.save();
};

// Method to complete job
jobSchema.methods.complete = function() {
    if (this.status !== 'Completed') {
        this.status = this.qcRequired ? 'QC Required' : 'Completed';
        this.endTime = new Date();
        this.completedAt = new Date();
        if (this.startTime) {
            let duration = Math.round((this.endTime - this.startTime) / (1000 * 60));
            if (this.pauseDuration) {
                duration -= this.pauseDuration;
            }
            this.duration = Math.max(0, duration);
        }
    }
    return this.save();
};

// Ensure virtuals are included in JSON
jobSchema.set('toJSON', { virtuals: true });
jobSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Job', jobSchema);
