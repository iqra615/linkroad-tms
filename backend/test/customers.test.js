const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { buildTestApp } = require('./setup');

const { app } = buildTestApp();
let token;
let customerId;

test('setup: register admin', async () => {
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ username: 'admin', password: 'admin123!', name: 'Admin' });
  token = reg.body.token;
});

test('rejects unauthenticated requests', async () => {
  const res = await request(app).get('/api/customers');
  assert.equal(res.status, 401);
});

test('rejects a customer with no name', async () => {
  const res = await request(app).post('/api/customers').set('Authorization', `Bearer ${token}`).send({});
  assert.equal(res.status, 400);
  assert.ok(res.body.details.some((d) => d.field === 'name'));
});

test('creates a customer', async () => {
  const res = await request(app)
    .post('/api/customers')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'SIG Combibloc Inc', address: '200 W North Ave, Northlake, IL 60164', terms: 'Net 30' });

  assert.equal(res.status, 201);
  assert.equal(res.body.customer.name, 'SIG Combibloc Inc');
  customerId = res.body.customer.id;
});

test('rejects an invalid email on create', async () => {
  const res = await request(app)
    .post('/api/customers')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Bad Email Co', email: 'not-an-email' });
  assert.equal(res.status, 400);
});

test('lists customers including the new one', async () => {
  const res = await request(app).get('/api/customers').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.customers.length, 1);
});

test('search filters by name', async () => {
  const hit = await request(app).get('/api/customers?search=Combibloc').set('Authorization', `Bearer ${token}`);
  assert.equal(hit.body.customers.length, 1);
  const miss = await request(app).get('/api/customers?search=Nonexistent').set('Authorization', `Bearer ${token}`);
  assert.equal(miss.body.customers.length, 0);
});

test('gets a single customer by id', async () => {
  const res = await request(app).get(`/api/customers/${customerId}`).set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.customer.id, customerId);
});

test('404s for a well-formed but unknown id', async () => {
  const res = await request(app)
    .get('/api/customers/00000000-0000-0000-0000-000000000000')
    .set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 404);
});

test('400s for a malformed id', async () => {
  const res = await request(app).get('/api/customers/not-a-uuid').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 400);
});

test('updates a customer', async () => {
  const res = await request(app)
    .put(`/api/customers/${customerId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'SIG Combibloc Inc.', terms: 'Net 45' });
  assert.equal(res.status, 200);
  assert.equal(res.body.customer.terms, 'Net 45');
});

test('deletes a customer', async () => {
  const res = await request(app).delete(`/api/customers/${customerId}`).set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 204);

  const after = await request(app).get('/api/customers').set('Authorization', `Bearer ${token}`);
  assert.equal(after.body.customers.length, 0);
});
