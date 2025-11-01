
const V2User = require('../models/V2User');
const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_TTL = process.env.JWT_ACCESS_EXPIRATION || '15m';
const REFRESH_TOKEN_TTL = process.env.JWT_REFRESH_EXPIRATION || '7d';

function resolveSecret(envKey, fallback) {
  const secret = process.env[envKey];
  if (secret && secret.trim()) {
    return secret.trim();
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${envKey} must be set in production environment`);
  }
  return fallback;
}

const ACCESS_TOKEN_SECRET = resolveSecret('JWT_ACCESS_SECRET', 'development-access-secret');
const REFRESH_TOKEN_SECRET = resolveSecret('JWT_REFRESH_SECRET', 'development-refresh-secret');

function sanitizeUser(userDoc) {
  if (!userDoc) return null;
  const user = userDoc.toObject({ virtuals: true });
  delete user.pinHash;
  delete user.passwordHash;
  user.id = String(user._id);
  delete user._id;
  delete user.__v;
  return user;
}

async function findUserByCredential(identifier) {
  if (!identifier) return null;
  const normalizedEmployee = String(identifier).toUpperCase();
  const normalizedUsername = String(identifier).toLowerCase();
  return V2User.findOne({
    $or: [
      { employeeNumber: normalizedEmployee },
      { username: normalizedUsername },
      { uid: identifier }
    ]
  });
}

async function findUserByPin(pin) {
  if (!pin) return null;
  const users = await V2User.find({ pinHash: { $exists: true, $ne: null }, isActive: { $ne: false } });
  for (const user of users) {
    if (await user.verifyPin(pin)) {
      return user;
    }
  }
  return null;
}

async function isPinInUse(pin, excludeId) {
  if (!pin) return false;
  const query = {
    pinHash: { $exists: true, $ne: null }
  };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  const users = await V2User.find(query);
  for (const user of users) {
    if (await user.verifyPin(pin)) {
      return true;
    }
  }
  return false;
}

function generateAccessToken(user) {
  return jwt.sign({ sub: String(user._id), role: user.role }, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_TTL
  });
}

function generateRefreshToken(user) {
  return jwt.sign({ sub: String(user._id) }, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_TTL
  });
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  try {
    const payload = jwt.verify(token, ACCESS_TOKEN_SECRET);
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = {
  sanitizeUser,
  findUserByCredential,
  findUserByPin,
  isPinInUse,
  generateAccessToken,
  generateRefreshToken,
  authenticateToken
};
