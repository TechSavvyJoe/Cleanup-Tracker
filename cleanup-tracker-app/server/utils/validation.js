
const Joi = require('joi');

const vehicleSchema = Joi.object({
  newUsed: Joi.string().trim().allow(''),
  stockNumber: Joi.string().trim().required(),
  vehicle: Joi.string().trim().allow(''),
  year: Joi.number().integer().min(1900).max(new Date().getFullYear() + 1).allow(null),
  make: Joi.string().trim().allow(''),
  model: Joi.string().trim().allow(''),
  body: Joi.string().trim().allow(''),
  drivetrain: Joi.string().trim().allow(''),
  color: Joi.string().trim().allow(''),
  odometer: Joi.string().trim().allow(''),
  price: Joi.string().trim().allow(''),
  age: Joi.number().integer().min(0).allow(null),
  vin: Joi.string().trim().required(),
  tags: Joi.string().trim().allow(''),
  status: Joi.string().trim().allow('')
});

module.exports = {
  vehicleSchema
};
