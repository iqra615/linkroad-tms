const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { buildTestApp } = require('./setup');

const { app } = buildTestApp();
let token;
let carrierId;

test('setup: register admin', async () => {
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ username: 'admin', password: 'admin123!', name: 'Admin' });
  token = reg.body.token;
});

test('creates a carrier', async () => {
  const res = await request(app)
    .post('/api/carriers')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'CC Cargo Express LLC',
      mc_number: '1561375',
      phone: '(347) 370-0357',
      email: 'dispatch@cccargoexpress.com',
      address: '833 E Front St Apt A, Plainfield, NJ 07062'
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.carrier.status, 'Approved'); // default
  carrierId = res.body.carrier.id;
});

test('rejects invalid status enum', async () => {
  const res = await request(app)
    .post('/api/carriers')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Bad Status Carrier', status: 'NotARealStatus' });
  assert.equal(res.status, 400);
});

test('filters by status', async () => {
  await request(app)
    .post('/api/carriers')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Pending Carrier LLC', status: 'Pending' });

  const approved = await request(app).get('/api/carriers?status=Approved').set('Authorization', `Bearer ${token}`);
  const pending = await request(app).get('/api/carriers?status=Pending').set('Authorization', `Bearer ${token}`);

  assert.equal(approved.body.carriers.length, 1);
  assert.equal(pending.body.carriers.length, 1);
});

test('searches by MC number', async () => {
  const res = await request(app).get('/api/carriers?search=1561375').set('Authorization', `Bearer ${token}`);
  assert.equal(res.body.carriers.length, 1);
  assert.equal(res.body.carriers[0].id, carrierId);
});

test('updates a carrier', async () => {
  const res = await request(app)
    .put(`/api/carriers/${carrierId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'CC Cargo Express LLC', status: 'Suspended' });
  assert.equal(res.status, 200);
  assert.equal(res.body.carrier.status, 'Suspended');
});

test('deletes a carrier', async () => {
  const res = await request(app).delete(`/api/carriers/${carrierId}`).set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 204);
});
