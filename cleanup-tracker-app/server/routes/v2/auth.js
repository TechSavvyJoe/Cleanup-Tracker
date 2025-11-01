
const express = require('express');
const router = express.Router();
const V2User = require('../../models/V2User');
const jwt = require('jsonwebtoken');
const {
  findUserByCredential,
  findUserByPin,
  isPinInUse,
  generateAccessToken,
  generateRefreshToken,
  sanitizeUser
} = require('../../utils/auth');

const ACCESS_TOKEN_TTL = process.env.JWT_ACCESS_EXPIRATION || '15m';
const REFRESH_TOKEN_TTL = process.env.JWT_REFRESH_EXPIRATION || '7d';

// Enhanced auth supporting PIN or employee number for all roles
router.post('/login', async (req, res) => {
  try {
    const { employeeId, pin } = req.body || {};
    const identifier = typeof employeeId === 'string' ? employeeId.trim() : '';
    const submittedPin = typeof pin === 'string' ? pin.trim() : '';

    if (!submittedPin) {
      return res.status(400).json({ error: 'PIN required' });
    }

    if (!/^[0-9]{4,8}$/.test(submittedPin)) {
      return res.status(400).json({ error: 'PIN must be 4-8 digits' });
    }

    let user = null;
    
    // If both employeeId and pin are provided AND they're different, use credential-based login
    // If they're the same (or only pin is provided), use PIN-only login
    if (pin && identifier && identifier !== submittedPin) {
      user = await findUserByCredential(identifier);
      if (!user || !(await user.verifyPin(submittedPin))) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    } else {
      // PIN-only login (or both fields have same value)
      user = await findUserByPin(submittedPin);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'User is inactive' });
    }

    user.lastLogin = new Date();
    await user.save();

    const sanitizedUser = sanitizeUser(user);
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    res.json({
      user: sanitizedUser,
      tokens: {
        accessToken,
        refreshToken,
        accessTokenExpiresIn: ACCESS_TOKEN_TTL,
        refreshTokenExpiresIn: REFRESH_TOKEN_TTL
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

router.post('/refresh', async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json({ error: 'refreshToken required' });
  }

  try {
    const payload = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
    const user = await V2User.findById(payload.sub);
    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid refresh token' });
    }

    res.json({
      accessToken: generateAccessToken(user),
      refreshToken: generateRefreshToken(user),
      accessTokenExpiresIn: ACCESS_TOKEN_TTL,
      refreshTokenExpiresIn: REFRESH_TOKEN_TTL
    });
  } catch (error) {
    return res.status(401).json({ error: 'Invalid refresh token' });
  }
});

module.exports = router;
