const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const JobSchema = new Schema({
  technicianId: { type: String, required: true },
  technicianName: { type: String, required: true },
  vin: { type: String, required: true },
  stockNumber: { type: String, required: true },
  vehicleDescription: { type: String, required: true },
  serviceType: { type: String, required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, default: null },
  duration: { type: Number, default: null },
  status: { type: String, enum: ['In Progress', 'Completed'], default: 'In Progress' },
  date: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Job', JobSchema);
