const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const { Schema } = mongoose;

const DEFAULT_PIN_MIN_LENGTH = 4;
const DEFAULT_PIN_MAX_LENGTH = 8;
const DEFAULT_PASSWORD_MIN_LENGTH = 8;
const DEFAULT_SALT_ROUNDS = 12;
const DEFAULT_LOCK_MAX_ATTEMPTS = 5;
const DEFAULT_LOCK_WINDOW_MINUTES = 15;
const DEFAULT_LOCK_DURATION_MINUTES = 30;

const PIN_MIN_LENGTH = Math.max(
  DEFAULT_PIN_MIN_LENGTH,
  parseInt(process.env.PIN_MIN_LENGTH || '', 10) || DEFAULT_PIN_MIN_LENGTH
);
const PIN_MAX_LENGTH = Math.max(
  PIN_MIN_LENGTH,
  parseInt(process.env.PIN_MAX_LENGTH || '', 10) || DEFAULT_PIN_MAX_LENGTH
);
const PASSWORD_MIN_LENGTH = Math.max(
  DEFAULT_PASSWORD_MIN_LENGTH,
  parseInt(process.env.V2_PASSWORD_MIN_LENGTH || '', 10) || DEFAULT_PASSWORD_MIN_LENGTH
);
const CREDENTIAL_SALT_ROUNDS = Math.max(
  8,
  parseInt(
    process.env.CREDENTIAL_SALT_ROUNDS ||
      process.env.BCRYPT_SALT_ROUNDS ||
      '',
    10
  ) || DEFAULT_SALT_ROUNDS
);
const LOCK_MAX_ATTEMPTS = Math.max(
  1,
  parseInt(process.env.AUTH_LOCK_MAX_ATTEMPTS || '', 10) || DEFAULT_LOCK_MAX_ATTEMPTS
);
const LOCK_WINDOW_MINUTES = Math.max(
  1,
  parseInt(process.env.AUTH_LOCK_WINDOW_MINUTES || '', 10) || DEFAULT_LOCK_WINDOW_MINUTES
);
const LOCK_DURATION_MINUTES = Math.max(
  1,
  parseInt(process.env.AUTH_LOCK_DURATION_MINUTES || '', 10) || DEFAULT_LOCK_DURATION_MINUTES
);

function normalizeDigits(value) {
  return String(value ?? '')
    .replace(/\s+/g, '')
    .trim();
}

function assertValidPin(pinCandidate) {
  const normalized = normalizeDigits(pinCandidate);
  if (!normalized) {
    throw new Error('PIN is required');
  }
  if (!/^[0-9]+$/.test(normalized)) {
    throw new Error('PIN must include digits only');
  }
  if (normalized.length < PIN_MIN_LENGTH || normalized.length > PIN_MAX_LENGTH) {
    throw new Error(
      `PIN must be between ${PIN_MIN_LENGTH} and ${PIN_MAX_LENGTH} digits`
    );
  }
  return normalized;
}

function assertValidPassword(passwordCandidate) {
  const password = String(passwordCandidate ?? '').trim();
  if (!password) {
    throw new Error('Password is required');
  }
  if (password.length < PASSWORD_MIN_LENGTH) {
    throw new Error(
      `Password must be at least ${PASSWORD_MIN_LENGTH} characters long`
    );
  }
  return password;
}

async function hashValue(rawValue) {
  return bcrypt.hash(rawValue, CREDENTIAL_SALT_ROUNDS);
}

const V2UserSchema = new Schema(
  {
    username: {
      type: String,
      trim: true,
      lowercase: true,
      sparse: true,
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
    pinHash: {
      type: String,
      select: false
    },
    pinLast4: {
      type: String,
      minlength: 1,
      maxlength: 4
    },
    pinLength: {
      type: Number,
      min: PIN_MIN_LENGTH,
      max: PIN_MAX_LENGTH
    },
    pinUpdatedAt: Date,
    pinRequiresReset: {
      type: Boolean,
      default: false
    },
    /**
     * Legacy plain-text PIN field.
     * We retain this with select: false so legacy databases can be upgraded at runtime.
     */
    pin: {
      type: String,
      trim: true,
      select: false
    },
    passwordHash: {
      type: String,
      select: false
    },
    passwordUpdatedAt: {
      type: Date
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
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
      min: 0
    },
    lastFailedLoginAt: {
      type: Date
    },
    lockedUntil: {
      type: Date,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes
V2UserSchema.index({ role: 1, isActive: 1 });
V2UserSchema.index({ employeeNumber: 1, role: 1 });
V2UserSchema.index({ pinLast4: 1, pinLength: 1 }, { sparse: true });

// Pre-save hook to ensure at least one identifier
V2UserSchema.pre('save', function ensureIdentifiers(next) {
  if (
    !this.username &&
    !this.employeeNumber &&
    !this.pinHash &&
    !this.passwordHash &&
    !this.pin
  ) {
    return next(
      new Error(
        'User must have at least one identifier (pin, employeeNumber, username, or password)'
      )
    );
  }
  return next();
});

// Method to update last login timestamp
V2UserSchema.methods.updateLastLogin = function updateLastLogin() {
  this.lastLogin = new Date();
  return this.save();
};

V2UserSchema.methods.setPin = async function setPin(pinCandidate, options = {}) {
  const normalized = assertValidPin(pinCandidate);
  this.pinHash = await hashValue(normalized);
  this.pinLast4 = normalized.slice(-4);
  this.pinLength = normalized.length;
  this.pinUpdatedAt = new Date();
  this.pinRequiresReset = Boolean(options.forceReset);
  // Clear legacy plain text copy if it still exists
  if (this.isModified('pin') || this.pin) {
    this.pin = undefined;
  }
};

V2UserSchema.methods.clearPin = function clearPin() {
  this.pinHash = undefined;
  this.pinLast4 = undefined;
  this.pinLength = undefined;
  this.pinUpdatedAt = undefined;
  this.pinRequiresReset = false;
  this.pin = undefined;
};

V2UserSchema.methods.verifyPin = async function verifyPin(pinCandidate) {
  const normalized = normalizeDigits(pinCandidate);
  if (!normalized) {
    return false;
  }
  if (this.pinHash) {
    return bcrypt.compare(normalized, this.pinHash);
  }
  // Fallback for legacy records
  if (this.pin) {
    return this.pin === normalized;
  }
  return false;
};

V2UserSchema.methods.hasPin = function hasPin() {
  return Boolean(this.pinHash || this.pin);
};

V2UserSchema.methods.isAccountLocked = function isAccountLocked(referenceDate = new Date()) {
  if (!this.lockedUntil) {
    return false;
  }
  const comparisonDate = referenceDate instanceof Date ? referenceDate : new Date(referenceDate);
  return this.lockedUntil > comparisonDate;
};

V2UserSchema.methods.recordFailedLogin = function recordFailedLogin(options = {}) {
  const now = new Date();
  const maxAttempts =
    options.maxAttempts ?? LOCK_MAX_ATTEMPTS;
  const windowMinutes =
    options.windowMinutes ?? LOCK_WINDOW_MINUTES;
  const lockDurationMinutes =
    options.lockDurationMinutes ?? LOCK_DURATION_MINUTES;

  if (this.lockedUntil && this.lockedUntil <= now) {
    this.lockedUntil = null;
    this.failedLoginAttempts = 0;
    this.lastFailedLoginAt = null;
  }

  if (
    !this.lastFailedLoginAt ||
    now.getTime() - this.lastFailedLoginAt.getTime() >
      windowMinutes * 60 * 1000
  ) {
    this.failedLoginAttempts = 1;
  } else {
    this.failedLoginAttempts = (this.failedLoginAttempts || 0) + 1;
  }

  this.lastFailedLoginAt = now;

  if (this.failedLoginAttempts >= maxAttempts) {
    this.lockedUntil = new Date(
      now.getTime() + lockDurationMinutes * 60 * 1000
    );
  }

  return {
    attempts: this.failedLoginAttempts,
    maxAttempts,
    locked: this.isAccountLocked(now),
    lockedUntil: this.lockedUntil
  };
};

V2UserSchema.methods.resetFailedLogin = function resetFailedLogin() {
  this.failedLoginAttempts = 0;
  this.lastFailedLoginAt = null;
  this.lockedUntil = null;
};

V2UserSchema.methods.setPassword = async function setPassword(passwordCandidate) {
  const password = assertValidPassword(passwordCandidate);
  this.passwordHash = await hashValue(password);
  this.passwordUpdatedAt = new Date();
};

V2UserSchema.methods.clearPassword = function clearPassword() {
  this.passwordHash = undefined;
  this.passwordUpdatedAt = undefined;
};

V2UserSchema.methods.verifyPassword = async function verifyPassword(
  passwordCandidate
) {
  const password = String(passwordCandidate ?? '');
  if (!password) {
    return false;
  }
  if (!this.passwordHash) {
    return false;
  }
  return bcrypt.compare(password, this.passwordHash);
};

// Virtual for display name
V2UserSchema.virtual('displayName').get(function displayName() {
  const identifier =
    this.employeeNumber ||
    (this.pinLast4 ? `**${this.pinLast4}` : this.username) ||
    String(this._id);
  return `${this.name} (${identifier})`;
});

// Ensure virtuals are included in JSON representations
V2UserSchema.set('toJSON', { virtuals: true });
V2UserSchema.set('toObject', { virtuals: true });

const V2User = mongoose.model('V2User', V2UserSchema);

// Share credential constraints for callers that need them
V2User.CREDENTIAL_SALT_ROUNDS = CREDENTIAL_SALT_ROUNDS;
V2User.PIN_MIN_LENGTH = PIN_MIN_LENGTH;
V2User.PIN_MAX_LENGTH = PIN_MAX_LENGTH;
V2User.PASSWORD_MIN_LENGTH = PASSWORD_MIN_LENGTH;
V2User.LOCK_MAX_ATTEMPTS = LOCK_MAX_ATTEMPTS;
V2User.LOCK_WINDOW_MINUTES = LOCK_WINDOW_MINUTES;
V2User.LOCK_DURATION_MINUTES = LOCK_DURATION_MINUTES;
V2User.assertValidPin = assertValidPin;

module.exports = V2User;
