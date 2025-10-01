const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const jobSchema = new mongoose.Schema({
  technicianId: { type: String, required: false },
  technicianName: { type: String, required: false },
  vin: { type: String, required: false },
  vehicleDescription: String,
  stockNumber: String,
  serviceType: String,
  startTime: Date,
  endTime: Date,
  completedAt: Date,
  status: { type: String, default: 'Pending', enum: ['Pending', 'In Progress', 'Paused', 'Completed', 'QC Required', 'QC Approved'] },
  issues: [String],
  duration: Number,
  date: String,
  priority: { type: String, default: 'Normal' },
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
  expectedDuration: { type: Number, default: 60 }, // minutes
  qcRequired: { type: Boolean, default: false },
  qcCompletedBy: String,
  qcCompletedAt: Date,
  qcNotes: String,
  qcEmployeeNumber: String
});

jobSchema.virtual('durationMinutes').get(function() {
  if (this.duration) return this.duration;
  if (this.endTime && this.startTime) {
    return Math.round((this.endTime - this.startTime) / (1000 * 60));
  }
  return 0;
});

module.exports = mongoose.model('Job', jobSchema);
