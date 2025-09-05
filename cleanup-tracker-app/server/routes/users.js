const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { jwtSecret } = require('../config/keys');

// @route   POST api/users/register
// @desc    Register a new user
// @access  Public (for setup, should be protected)
router.post('/register', (req, res) => {
    const { username, password, role } = req.body;

    User.findOne({ username }).then(user => {
        if (user) {
            return res.status(400).json({ username: 'Username already exists' });
        }

        const newUser = new User({
            username,
            password,
            role
        });

        bcrypt.genSalt(10, (err, salt) => {
            bcrypt.hash(newUser.password, salt, (err, hash) => {
                if (err) throw err;
                newUser.password = hash;
                newUser.save()
                    .then(user => res.json(user))
                    .catch(err => console.log(err));
            });
        });
    });
});

// @route   POST api/users/login
// @desc    Login user and return JWT token
// @access  Public
router.post('/login', (req, res) => {
    const { username, password } = req.body;

    User.findOne({ username }).then(user => {
        if (!user) {
            return res.status(404).json({ usernamenotfound: 'Username not found' });
        }

        bcrypt.compare(password, user.password).then(isMatch => {
            if (isMatch) {
                const payload = { id: user.id, username: user.username, role: user.role };
                jwt.sign(
                    payload,
                    jwtSecret, // configurable secret (env or default)
                    { expiresIn: 3600 },
                    (err, token) => {
                        res.json({
                            success: true,
                            token: 'Bearer ' + token
                        });
                    }
                );
            } else {
                return res.status(400).json({ passwordincorrect: 'Password incorrect' });
            }
        });
    });
});

module.exports = router;
