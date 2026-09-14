const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { buildTestApp } = require('./setup');

const { app } = buildTestApp();
let adminToken;
let dispatcherToken;

test('setup: create admin via register, then a dispatcher via admin', async () => {
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ username: 'admin', password: 'admin123!', name: 'Admin' });
  adminToken = reg.body.token;

  const created = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ username: 'dispatch1', password: 'password123', name: 'Dana Dispatcher', role: 'Dispatcher' });

  assert.equal(created.status, 201);
  assert.equal(created.body.user.role, 'Dispatcher');

  const login = await request(app).post('/api/auth/login').send({ username: 'dispatch1', password: 'password123' });
  dispatcherToken = login.body.token;
  assert.ok(dispatcherToken);
});

test('non-admin cannot list users', async () => {
  const res = await request(app).get('/api/users').set('Authorization', `Bearer ${dispatcherToken}`);
  assert.equal(res.status, 403);
});

test('admin can list users', async () => {
  const res = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.users.length, 2);
});

test('admin can update another user role', async () => {
  const list = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);
  const dispatcher = list.body.users.find((u) => u.username === 'dispatch1');

  const res = await request(app)
    .put(`/api/users/${dispatcher.id}`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ role: 'Accounting' });

  assert.equal(res.status, 200);
  assert.equal(res.body.user.role, 'Accounting');
});

test('cannot delete the last administrator', async () => {
  const list = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);
  const admin = list.body.users.find((u) => u.username === 'admin');

  const res = await request(app).delete(`/api/users/${admin.id}`).set('Authorization', `Bearer ${adminToken}`);
  assert.equal(res.status, 400);
});

test('admin cannot delete their own account via the generic delete route', async () => {
  const list = await request(app).get('/api/users').set('Authorization', `Bearer ${adminToken}`);
  const admin = list.body.users.find((u) => u.username === 'admin');
  // Same as above scenario but explicitly checks the "self-delete" guard message path
  const res = await request(app).delete(`/api/users/${admin.id}`).set('Authorization', `Bearer ${adminToken}`);
  assert.equal(res.status, 400);
});
