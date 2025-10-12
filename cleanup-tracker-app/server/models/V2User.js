const mongoose = require('mongoose');
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
    password: {
        type: String
    },
    pin: {
        type: String,
        trim: true,
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

// Pre-save hook to ensure at least one identifier
V2UserSchema.pre('save', function(next) {
    if (!this.pin && !this.employeeNumber && !this.username) {
        next(new Error('User must have at least one identifier (pin, employeeNumber, or username)'));
    } else {
        next();
    }
});

// Method to update last login
V2UserSchema.methods.updateLastLogin = function() {
    this.lastLogin = new Date();
    return this.save();
};

// Virtual for display name
V2UserSchema.virtual('displayName').get(function() {
    return `${this.name} (${this.employeeNumber || this.pin || this.username})`;
});

// Ensure virtuals are included in JSON
V2UserSchema.set('toJSON', { virtuals: true });
V2UserSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('V2User', V2UserSchema);
