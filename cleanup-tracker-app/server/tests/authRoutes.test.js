const test = require('node:test');
const assert = require('node:assert/strict');
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const supertest = require('supertest');

let mongoServer;
let request;
let connectDb;
let V2User;

test.before(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();

  process.env.NODE_ENV = 'test';
  process.env.MONGO_URI = uri;
  process.env.JWT_SECRET = 'integration-jwt-secret';
  process.env.JWT_ACCESS_SECRET = 'integration-access-secret';
  process.env.JWT_REFRESH_SECRET = 'integration-refresh-secret';

  // Require server after env setup so configuration picks up overrides
  // eslint-disable-next-line global-require
  const serverModule = require('../server');
  connectDb = serverModule.connectDb;
  const { app } = serverModule;

  await connectDb();
  request = supertest(app);
  V2User = require('../models/V2User');
});

test.after(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

test('manager can unlock locked account and detailer can login afterwards', async () => {
  const manager = new V2User({
    name: 'Manager One',
    role: 'manager',
    employeeNumber: 'MGR001',
    username: 'manager'
  });
  await manager.setPin('1111');
  await manager.save();

  const detailer = new V2User({
    name: 'Detailer One',
    role: 'detailer',
    employeeNumber: 'DET123',
    uid: 'detailer-123'
  });
  await detailer.setPin('2222');
  await detailer.save();

  // Manager login to get auth token
  const managerLogin = await request
    .post('/api/v2/auth/login')
    .send({ employeeId: 'MGR001', pin: '1111' })
    .expect(200);

  assert.ok(managerLogin.body?.tokens?.accessToken, 'manager access token missing');
  const managerToken = managerLogin.body.tokens.accessToken;

  // Fail detailer login until locked (default max attempts = 5)
  for (let i = 0; i < 5; i += 1) {
    const response = await request
      .post('/api/v2/auth/login')
      .send({ employeeId: 'DET123', pin: '9999' });

    if (i < 4) {
      assert.equal(response.status, 401, 'Expected 401 before lock threshold');
    } else {
      assert.equal(response.status, 423, 'Expected 423 after exceeding attempts');
      assert.equal(response.body.locked, true);
    }
  }

  // Attempt login again while locked
  const lockedAttempt = await request
    .post('/api/v2/auth/login')
    .send({ employeeId: 'DET123', pin: '2222' })
    .expect(423);
  assert.equal(lockedAttempt.body.locked, true);

  // Manager unlocks the account
  const unlockResponse = await request
    .post(`/api/v2/users/${detailer.id}/unlock`)
    .set('Authorization', `Bearer ${managerToken}`)
    .expect(200);

  assert.equal(unlockResponse.body.accountLocked, false);
  assert.equal(unlockResponse.body.failedLoginAttempts || 0, 0);

  // Detailer should now login successfully
  const detailerLogin = await request
    .post('/api/v2/auth/login')
    .send({ employeeId: 'DET123', pin: '2222' })
    .expect(200);

  assert.ok(detailerLogin.body?.tokens?.accessToken, 'detailer access token missing');
});
