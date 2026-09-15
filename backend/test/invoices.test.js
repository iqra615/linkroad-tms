const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { buildTestApp } = require('./setup');

const { app } = buildTestApp();
let token, entityId;
let customerId, loadWithRateId, loadNoRateId, invoiceId;

test('setup: admin + entity + customer + two loads (with/without a customer_charge)', async () => {
  const reg = await request(app).post('/api/auth/register').send({ username: 'admin', password: 'admin123!', name: 'Admin' });
  token = reg.body.token;

  const entList = await request(app).get('/api/entities').set('Authorization', `Bearer ${token}`);
  entityId = entList.body.entities.find((e) => e.code === 'LRL').id;

  const customer = await request(app).post('/api/customers').set('Authorization', `Bearer ${token}`).send({ name: 'SIG Combibloc Inc' });
  customerId = customer.body.customer.id;

  const loadWithRate = await request(app).post('/api/loads').set('Authorization', `Bearer ${token}`)
    .send({ entity_id: entityId, customer_id: customerId, customer_charge: 1968.08 });
  loadWithRateId = loadWithRate.body.load.id;

  const loadNoRate = await request(app).post('/api/loads').set('Authorization', `Bearer ${token}`)
    .send({ entity_id: entityId, customer_id: customerId });
  loadNoRateId = loadNoRate.body.load.id;
});

test('creating an invoice with no amount pulls the load customer_charge', async () => {
  const res = await request(app).post('/api/invoices').set('Authorization', `Bearer ${token}`).send({ load_id: loadWithRateId });
  assert.equal(res.status, 201);
  assert.equal(Number(res.body.invoice.amount), 1968.08);
  assert.equal(res.body.invoice.status, 'Not Sent');
  invoiceId = res.body.invoice.id;
});

test('creating an invoice for a load with no customer_charge and no amount fails clearly', async () => {
  const res = await request(app).post('/api/invoices').set('Authorization', `Bearer ${token}`).send({ load_id: loadNoRateId });
  assert.equal(res.status, 400);
});

test('marks an invoice Sent then Paid', async () => {
  let res = await request(app).patch(`/api/invoices/${invoiceId}/status`).set('Authorization', `Bearer ${token}`).send({ status: 'Sent' });
  assert.equal(res.body.invoice.status, 'Sent');
  res = await request(app).patch(`/api/invoices/${invoiceId}/status`).set('Authorization', `Bearer ${token}`).send({ status: 'Paid' });
  assert.equal(res.body.invoice.status, 'Paid');
  assert.ok(res.body.invoice.paid_date);
});

test('deletes an invoice', async () => {
  const res = await request(app).delete(`/api/invoices/${invoiceId}`).set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 204);
});
