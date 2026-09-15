const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { buildTestApp } = require('./setup');

const { app } = buildTestApp();
let token;
let carrierId;

test('setup: register admin', async () => {
  const reg = await request(app).post('/api/auth/register').send({ username: 'admin', password: 'admin123!', name: 'Admin' });
  token = reg.body.token;
});

test('creates a carrier with DOT number, state, and dispatcher name', async () => {
  const res = await request(app)
    .post('/api/carriers')
    .set('Authorization', `Bearer ${token}`)
    .send({
      name: 'Swift Haulage Inc.', mc_number: 'MC-000000', dot_number: 'DOT-0000000',
      email: 'dispatch@swifthaulage.com', city: 'Chicago', state: 'IL', dispatcher_name: 'Mike Ross'
    });

  assert.equal(res.status, 201);
  assert.equal(res.body.carrier.status, 'Active'); // default
  assert.equal(res.body.carrier.dot_number, 'DOT-0000000');
  assert.equal(res.body.carrier.state, 'IL');
  assert.equal(res.body.carrier.dispatcher_name, 'Mike Ross');
  carrierId = res.body.carrier.id;
});

test('rejects invalid status enum', async () => {
  const res = await request(app)
    .post('/api/carriers')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Bad Status Carrier', status: 'NotARealStatus' });
  assert.equal(res.status, 400);
});

test('searches by DOT number', async () => {
  const res = await request(app).get('/api/carriers?search=DOT-0000000').set('Authorization', `Bearer ${token}`);
  assert.equal(res.body.carriers.length, 1);
  assert.equal(res.body.carriers[0].id, carrierId);
});

test('updates carrier state and dispatcher name', async () => {
  const res = await request(app)
    .put(`/api/carriers/${carrierId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Swift Haulage Inc.', state: 'IN', dispatcher_name: 'John Doe', status: 'Suspended' });
  assert.equal(res.status, 200);
  assert.equal(res.body.carrier.state, 'IN');
  assert.equal(res.body.carrier.status, 'Suspended');
});

test('deletes a carrier', async () => {
  const res = await request(app).delete(`/api/carriers/${carrierId}`).set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 204);
});
