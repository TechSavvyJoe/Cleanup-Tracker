const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const V2User = require('../models/V2User');

test.after(() => mongoose.disconnect());

test('setPin hashes credentials and can verify', async () => {
  const user = new V2User({ name: 'Verifier', role: 'detailer' });
  await user.setPin('1234');

  assert.ok(user.pinHash, 'pinHash should be populated after setPin');
  assert.equal(user.pinLast4, '1234');
  assert.equal(user.pinLength, 4);
  assert.ok(await user.verifyPin('1234'), 'PIN should verify after hashing');
  assert.equal(await user.verifyPin('0000'), false, 'Mismatched PIN should fail verification');
});

test('setPin enforces numeric boundaries', async () => {
  const user = new V2User({ name: 'Validator', role: 'manager' });

  await assert.rejects(user.setPin('12'), { message: /between/ });
  await assert.rejects(user.setPin('abcd'), { message: /digits only/ });
  await assert.rejects(user.setPin(''), { message: /required/ });
});

test('verifyPin falls back to legacy plain-text pins', async () => {
  const legacy = new V2User({ name: 'Legacy', role: 'detailer' });
  legacy.pin = '7777';

  assert.equal(await legacy.verifyPin('7777'), true, 'Legacy pin should verify until migrated');
  assert.equal(await legacy.verifyPin('0000'), false);
});

test('recordFailedLogin locks account after threshold', () => {
  const user = new V2User({ name: 'Lockable', role: 'manager' });
  const settings = { maxAttempts: 2, windowMinutes: 15, lockDurationMinutes: 30 };

  const firstAttempt = user.recordFailedLogin(settings);
  assert.equal(firstAttempt.locked, false);
  assert.equal(user.failedLoginAttempts, 1);

  const secondAttempt = user.recordFailedLogin(settings);
  assert.equal(secondAttempt.locked, true);
  assert.equal(user.failedLoginAttempts, 2);
  assert.equal(user.isAccountLocked(), true);

  user.resetFailedLogin();
  assert.equal(user.failedLoginAttempts, 0);
  assert.equal(user.isAccountLocked(), false);
});

test('recordFailedLogin resets attempt window after timeout', () => {
  const user = new V2User({ name: 'Window', role: 'detailer' });
  const settings = { maxAttempts: 3, windowMinutes: 1, lockDurationMinutes: 30 };

  user.recordFailedLogin(settings);
  assert.equal(user.failedLoginAttempts, 1);

  // Simulate waiting beyond the window
  user.lastFailedLoginAt = new Date(Date.now() - 5 * 60 * 1000);

  const nextAttempt = user.recordFailedLogin(settings);
  assert.equal(nextAttempt.attempts, 1);
  assert.equal(nextAttempt.locked, false);
  assert.equal(user.failedLoginAttempts, 1);
});
