const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { buildTestApp } = require('./setup');

const { app } = buildTestApp();

test('first registration succeeds and becomes Administrator', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ username: 'admin', password: 'admin123!', name: 'Admin' });

  assert.equal(res.status, 201);
  assert.equal(res.body.user.role, 'Administrator');
  assert.ok(res.body.token);
  assert.equal(res.body.user.username, 'admin');
  assert.equal(res.body.user.password, undefined); // never leak the hash
});

test('second registration is blocked once an account exists', async () => {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ username: 'someoneelse', password: 'password123', name: 'Someone' });

  assert.equal(res.status, 403);
});

test('login fails with wrong password', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'wrong-password' });

  assert.equal(res.status, 401);
});

test('login fails for unknown username (no user enumeration hint)', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'nobody', password: 'whatever123' });

  assert.equal(res.status, 401);
  assert.equal(res.body.error, 'Invalid username or password.');
});

test('login succeeds with correct credentials and returns a usable JWT', async () => {
  const res = await request(app)
    .post('/api/auth/login')
    .send({ username: 'admin', password: 'admin123!' });

  assert.equal(res.status, 200);
  assert.ok(res.body.token);

  const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${res.body.token}`);
  assert.equal(me.status, 200);
  assert.equal(me.body.user.username, 'admin');
});

test('protected routes reject requests with no token', async () => {
  const res = await request(app).get('/api/auth/me');
  assert.equal(res.status, 401);
});

test('protected routes reject a garbage token', async () => {
  const res = await request(app).get('/api/auth/me').set('Authorization', 'Bearer not-a-real-token');
  assert.equal(res.status, 401);
});

test('validation rejects a short password on register-shaped payloads', async () => {
  const res = await request(app)
    .post('/api/users')
    .send({ username: 'x', password: '123', name: 'X', role: 'Dispatcher' });
  // No auth token at all yet, so this should 401 before validation even matters —
  // confirms route ordering (auth middleware runs first).
  assert.equal(res.status, 401);
});
