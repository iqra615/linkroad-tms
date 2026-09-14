const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { buildTestApp } = require('./setup');

const { app } = buildTestApp();
let token;
let consigneeId;

test('setup: register admin', async () => {
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ username: 'admin', password: 'admin123!', name: 'Admin' });
  token = reg.body.token;
});

test('creates a consignee', async () => {
  const res = await request(app)
    .post('/api/consignees')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Schindler Elevator Corp', address: '700 Canal Road Ext, Suite 100, York, PA 17406' });

  assert.equal(res.status, 201);
  consigneeId = res.body.consignee.id;
});

test('lists and searches consignees', async () => {
  const list = await request(app).get('/api/consignees').set('Authorization', `Bearer ${token}`);
  assert.equal(list.body.consignees.length, 1);

  const hit = await request(app).get('/api/consignees?search=Schindler').set('Authorization', `Bearer ${token}`);
  assert.equal(hit.body.consignees.length, 1);
});

test('updates a consignee', async () => {
  const res = await request(app)
    .put(`/api/consignees/${consigneeId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Schindler Elevator Corp', contact: 'Receiving Dept' });
  assert.equal(res.status, 200);
  assert.equal(res.body.consignee.contact, 'Receiving Dept');
});

test('deletes a consignee', async () => {
  const res = await request(app).delete(`/api/consignees/${consigneeId}`).set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 204);
});
