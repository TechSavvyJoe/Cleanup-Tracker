const settingsStore = require('./settingsStore');

const DEFAULT_INVENTORY_CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vSTW7Nwrbbl3Lp7R3RlKfSx-cd1tAffBzTINNOrCnaU1wp3kA7av63Y5Af8Jn4ATMDB09XcIAO_wodU/pub?output=csv';

function getInventoryCsvUrl() {
  return (
    settingsStore.get('inventoryCsvUrl') ||
    process.env.INVENTORY_CSV_URL ||
    DEFAULT_INVENTORY_CSV_URL
  );
}

async function setInventoryCsvUrl(url) {
  if (typeof url !== 'string' || !url.trim()) {
    throw new Error('A non-empty URL string is required');
  }
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error('Inventory CSV URL must start with http or https');
  }
  process.env.INVENTORY_CSV_URL = trimmed;
  await settingsStore.set('inventoryCsvUrl', trimmed);
  return trimmed;
}

module.exports = {
  DEFAULT_INVENTORY_CSV_URL,
  getInventoryCsvUrl,
  setInventoryCsvUrl
};
