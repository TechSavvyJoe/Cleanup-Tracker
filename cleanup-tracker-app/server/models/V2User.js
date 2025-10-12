const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Schema = mongoose.Schema;

const V2UserSchema = new Schema({
    username: {
        type: String,
        trim: true,
        lowercase: true,
        sparse: true, // Allows null but unique if provided
        index: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    role: {
        type: String,
        enum: ['manager', 'detailer', 'salesperson'],
        required: true,
        index: true
    },
    passwordHash: {
        type: String
    },
    pinHash: {
        type: String,
        index: true
    },
    uid: {
        type: String,
        sparse: true,
        index: true
    },
    employeeNumber: {
        type: String,
        trim: true,
        uppercase: true,
        sparse: true,
        index: true
    },
    phoneNumber: {
        type: String,
        trim: true,
        match: /^[0-9\-\(\)\s+]*$/
    },
    department: {
        type: String
    },
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    lastLogin: {
        type: Date
    }
}, {
    timestamps: true
});

// Compound indexes
V2UserSchema.index({ role: 1, isActive: 1 });
V2UserSchema.index({ employeeNumber: 1, role: 1 });

// Virtual setters to capture raw secrets before hashing
V2UserSchema.virtual('pin').set(function(pin) {
    this._plainPin = pin;
});

V2UserSchema.virtual('password').set(function(password) {
    this._plainPassword = password;
});

// Pre-save hook to ensure at least one identifier
V2UserSchema.pre('save', async function(next) {
    try {
        if (!this._plainPin && !this.pinHash && !this.employeeNumber && !this.username) {
            throw new Error('User must have at least one identifier (pin, employeeNumber, or username)');
        }

        if (this._plainPin) {
            const salt = await bcrypt.genSalt(10);
            this.pinHash = await bcrypt.hash(this._plainPin, salt);
            this._plainPin = undefined;
        }

        if (this._plainPassword) {
            const salt = await bcrypt.genSalt(10);
            this.passwordHash = await bcrypt.hash(this._plainPassword, salt);
            this._plainPassword = undefined;
        }

        next();
    } catch (err) {
        next(err);
    }
});

// Method to update last login
V2UserSchema.methods.updateLastLogin = function() {
    this.lastLogin = new Date();
    return this.save();
};

// Verify helpers
V2UserSchema.methods.verifyPin = async function(candidate) {
    if (!this.pinHash) return false;
    return bcrypt.compare(candidate, this.pinHash);
};

V2UserSchema.methods.verifyPassword = async function(candidate) {
    if (!this.passwordHash) return false;
    return bcrypt.compare(candidate, this.passwordHash);
};

// Virtual for display name
V2UserSchema.virtual('displayName').get(function() {
    return `${this.name} (${this.employeeNumber || this.username || this.uid || 'N/A'})`;
});

const removeSecrets = (_, ret) => {
    delete ret.pinHash;
    delete ret.passwordHash;
    delete ret._plainPin;
    delete ret._plainPassword;
    return ret;
};

// Ensure virtuals are included in JSON
V2UserSchema.set('toJSON', { virtuals: true, transform: removeSecrets });
V2UserSchema.set('toObject', { virtuals: true, transform: removeSecrets });

module.exports = mongoose.model('V2User', V2UserSchema);
