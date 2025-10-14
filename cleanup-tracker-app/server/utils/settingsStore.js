const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const dataDir = path.join(__dirname, '..', 'data');
const settingsFile = path.join(dataDir, 'settings.json');

const cache = new Map();
let initialized = false;

function loadFromDisk() {
  try {
    if (!fs.existsSync(settingsFile)) {
      initialized = true;
      return;
    }
    const raw = fs.readFileSync(settingsFile, 'utf8');
    if (!raw.trim()) {
      initialized = true;
      return;
    }
    const parsed = JSON.parse(raw);
    Object.entries(parsed).forEach(([key, value]) => {
      cache.set(key, value);
    });
    initialized = true;
  } catch (error) {
    console.warn('settingsStore: failed to load persisted settings:', error.message);
    initialized = true;
  }
}

async function persistToDisk() {
  const obj = Object.fromEntries(cache.entries());
  await fsp.mkdir(dataDir, { recursive: true });
  await fsp.writeFile(settingsFile, JSON.stringify(obj, null, 2), 'utf8');
}

function get(key) {
  if (!initialized) {
    loadFromDisk();
  }
  return cache.get(key);
}

async function set(key, value) {
  if (!initialized) {
    loadFromDisk();
  }
  if (value === undefined) {
    cache.delete(key);
  } else {
    cache.set(key, value);
  }
  try {
    await persistToDisk();
  } catch (error) {
    console.error('settingsStore: failed to persist settings:', error.message);
  }
}

function getAll() {
  if (!initialized) {
    loadFromDisk();
  }
  return Object.fromEntries(cache.entries());
}

module.exports = {
  get,
  set,
  getAll,
  settingsFile
};
