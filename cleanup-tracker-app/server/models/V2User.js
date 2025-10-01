const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const V2UserSchema = new Schema({
  username: { type: String },
  name: { type: String, required: true },
  role: { type: String, enum: ['manager', 'detailer', 'salesperson'], required: true },
  password: { type: String },
  pin: { type: String },
  uid: { type: String },
  employeeNumber: { type: String },
  phoneNumber: { type: String },
  department: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('V2User', V2UserSchema);
