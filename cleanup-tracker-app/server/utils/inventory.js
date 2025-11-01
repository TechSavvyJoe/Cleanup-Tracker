
const axios = require('axios');
const csv = require('csv-parser');
const Vehicle = require('../models/Vehicle');
const { getInventoryCsvUrl } = require('./inventorySource');
const { headerMap } = require('../config/csv');
const { vehicleSchema } = require('./validation');

async function fetchAndImportInventory() {
  const SHEET_URL = getInventoryCsvUrl();
  console.log('Fetching inventory CSV from', SHEET_URL);
  const response = await axios.get(SHEET_URL, { responseType: 'stream' });
  const rows = [];
  await new Promise((resolve, reject) => {
    response.data
      .pipe(csv({ mapHeaders: ({ header, index }) => headerMap[index] || null }))
      .on('data', (row) => rows.push(row))
      .on('error', reject)
      .on('end', resolve);
  });
  if (!rows.length) { console.warn('Inventory CSV empty.'); return; }
  const cleanInt = (v) => { const n = parseInt(String(v || '').replace(/[^0-9-]/g, ''), 10); return Number.isNaN(n) ? null : n; };
  const cleanStr = (v) => (v == null ? '' : String(v).trim());
  const cleanPrice = (v) => (v == null ? '' : String(v).replace(/[^0-9.]/g, '').trim());
  const ops = rows.filter(r => cleanStr(r.vin) && cleanStr(r.stockNumber)).map(r => {
    const doc = {
      newUsed: cleanStr(r.newUsed), stockNumber: cleanStr(r.stockNumber), vehicle: cleanStr(r.vehicle),
      year: cleanInt(r.year), make: cleanStr(r.make), model: cleanStr(r.model), body: cleanStr(r.body),
      drivetrain: cleanStr(r.drivetrain), color: cleanStr(r.color), odometer: cleanStr(r.odometer), price: cleanPrice(r.price),
      age: cleanInt(r.age), vin: cleanStr(r.vin), tags: cleanStr(r.tags), status: cleanStr(r.status)
    };
    const { error } = vehicleSchema.validate(doc);
    if (error) {
      console.warn('Invalid vehicle data, skipping:', error.details[0].message);
      return null;
    }
    return { updateOne: { filter: { vin: doc.vin }, update: { $set: doc }, upsert: true } };
  }).filter(Boolean);
  if (!ops.length) { console.warn('No valid VIN rows found in inventory CSV.'); return; }
  const result = await Vehicle.bulkWrite(ops, { ordered: false });
  const total = await Vehicle.countDocuments();
  console.log(`Inventory import done. upserted=${result.upsertedCount || 0}, modified=${result.modifiedCount || 0}, total=${total}`);
}

module.exports = {
  fetchAndImportInventory
};
