const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { jwtSecret } = require('../config/keys');

// Input validation helper
function validateInput(username, password) {
    const errors = {};

    if (!username || typeof username !== 'string' || username.trim().length < 3) {
        errors.username = 'Username must be at least 3 characters';
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
        errors.password = 'Password must be at least 6 characters';
    }

    return {
        errors,
        isValid: Object.keys(errors).length === 0
    };
}

// @route   POST api/users/register
// @desc    Register a new user
// @access  Public (for setup, should be protected in production)
router.post('/register', async (req, res) => {
    try {
        const { username, password, role } = req.body;

        // Validate input
        const { errors, isValid } = validateInput(username, password);
        if (!isValid) {
            return res.status(400).json(errors);
        }

        // Validate role
        const validRoles = ['detailer', 'manager', 'owner'];
        if (!role || !validRoles.includes(role)) {
            return res.status(400).json({ role: 'Invalid role. Must be detailer, manager, or owner' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ username: username.trim().toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ username: 'Username already exists' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Create new user
        const newUser = new User({
            username: username.trim().toLowerCase(),
            password: hashedPassword,
            role
        });

        const savedUser = await newUser.save();

        // Return user without password
        res.json({
            id: savedUser._id,
            username: savedUser.username,
            role: savedUser.role
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Server error during registration' });
    }
});

// @route   POST api/users/login
// @desc    Login user and return JWT token
// @access  Public
router.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validate input
        const { errors, isValid } = validateInput(username, password);
        if (!isValid) {
            return res.status(400).json(errors);
        }

        // Find user
        const user = await User.findOne({ username: username.trim().toLowerCase() });
        if (!user) {
            return res.status(404).json({ usernamenotfound: 'Username not found' });
        }

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ passwordincorrect: 'Password incorrect' });
        }

        // Create JWT payload
        const payload = {
            id: user.id,
            username: user.username,
            role: user.role
        };

        // Sign token (expires in 24 hours instead of 1 hour)
        const token = jwt.sign(
            payload,
            jwtSecret,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token: 'Bearer ' + token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Server error during login' });
    }
});

module.exports = router;
