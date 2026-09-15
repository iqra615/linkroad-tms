const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { buildTestApp } = require('./setup');

const { app } = buildTestApp();
let token;

test('setup: register admin', async () => {
  const reg = await request(app).post('/api/auth/register').send({ username: 'admin', password: 'admin123!', name: 'Admin' });
  token = reg.body.token;
});

test('lists the 3 seeded entities', async () => {
  const res = await request(app).get('/api/entities').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.entities.length, 3);
  const codes = res.body.entities.map((e) => e.code).sort();
  assert.deepEqual(codes, ['EXP', 'LRL', 'PIT']);
});

test('gets a single entity', async () => {
  const list = await request(app).get('/api/entities').set('Authorization', `Bearer ${token}`);
  const lrl = list.body.entities.find((e) => e.code === 'LRL');
  const res = await request(app).get(`/api/entities/${lrl.id}`).set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.entity.name, 'Link Road Logistics Inc.');
});

test('admin can update entity contact info', async () => {
  const list = await request(app).get('/api/entities').set('Authorization', `Bearer ${token}`);
  const pit = list.body.entities.find((e) => e.code === 'PIT');

  const res = await request(app)
    .put(`/api/entities/${pit.id}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Prime Intermodal Transportation', email: 'dispatch@primeintermodal.com', address: '123 Main St' });

  assert.equal(res.status, 200);
  assert.equal(res.body.entity.email, 'dispatch@primeintermodal.com');
});

test('non-admin cannot update entity info', async () => {
  const created = await request(app)
    .post('/api/users')
    .set('Authorization', `Bearer ${token}`)
    .send({ username: 'dispatch1', password: 'password123', name: 'Dana', role: 'Dispatcher' });
  const login = await request(app).post('/api/auth/login').send({ username: 'dispatch1', password: 'password123' });
  const dispatcherToken = login.body.token;

  const list = await request(app).get('/api/entities').set('Authorization', `Bearer ${token}`);
  const lrl = list.body.entities.find((e) => e.code === 'LRL');

  const res = await request(app)
    .put(`/api/entities/${lrl.id}`)
    .set('Authorization', `Bearer ${dispatcherToken}`)
    .send({ name: 'Hacked Name' });
  assert.equal(res.status, 403);
});
