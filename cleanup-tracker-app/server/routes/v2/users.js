
const express = require('express');
const router = express.Router();
const V2User = require('../../models/V2User');
const {
  isPinInUse,
  sanitizeUser
} = require('../../utils/auth');

// Users
router.get('/', async (req, res) => {
  try {
    const users = await V2User.find();
    res.json(users.map(sanitizeUser));
  } catch (error) {
    console.error('Failed to fetch users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { name, pin, role = 'detailer', employeeNumber, phoneNumber, department, uid } = req.body || {};
    if (!name || !pin) {
      return res.status(400).json({ error: 'name and pin are required' });
    }

    // Validate role
    const validRoles = ['manager', 'detailer', 'salesperson'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
    }

    if (await isPinInUse(pin)) {
      return res.status(409).json({ error: 'PIN already in use' });
    }

    const user = new V2User({
      name: name.trim(),
      role,
      employeeNumber: employeeNumber ? String(employeeNumber).toUpperCase() : undefined,
      phoneNumber,
      department,
      uid: uid || (role === 'detailer' ? `detailer-${Date.now()}` : undefined)
    });

    user.pin = pin;
    await user.save();

    res.status(201).json(sanitizeUser(user));
  } catch (error) {
    console.error('Failed to create user:', error);
    res.status(500).json({ error: error.message || 'Failed to create user' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, pin, employeeNumber, phoneNumber, department, role, isActive } = req.body || {};
    const { id } = req.params;

    const user = await V2User.findById(id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Validate role if provided
    if (role !== undefined) {
      const validRoles = ['manager', 'detailer', 'salesperson'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
      }
    }

    if (pin) {
      if (await isPinInUse(pin, id)) {
        return res.status(409).json({ error: 'PIN already in use' });
      }
      user.pin = pin;
    }

    if (name !== undefined) user.name = name;
    if (employeeNumber !== undefined) {
      user.employeeNumber = employeeNumber ? String(employeeNumber).toUpperCase() : undefined;
    }
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    if (department !== undefined) user.department = department;
    if (role !== undefined) user.role = role;
    if (typeof isActive === 'boolean') user.isActive = isActive;

    await user.save();
    res.json(sanitizeUser(user));
  } catch (error) {
    console.error('Failed to update user:', error);
    res.status(500).json({ error: error.message || 'Failed to update user' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const result = await V2User.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(204).end();
  } catch (error) {
    console.error('Failed to delete user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
