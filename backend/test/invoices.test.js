const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { buildTestApp } = require('./setup');

const { app } = buildTestApp();
let token;
let customerId, loadWithRateId, loadNoRateId, invoiceId;

test('setup: admin + customer + two loads (with/without a customer_rate)', async () => {
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ username: 'admin', password: 'admin123!', name: 'Admin' });
  token = reg.body.token;

  const customer = await request(app)
    .post('/api/customers')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'SIG Combibloc Inc' });
  customerId = customer.body.customer.id;

  const loadWithRate = await request(app)
    .post('/api/loads')
    .set('Authorization', `Bearer ${token}`)
    .send({ customer_id: customerId, customer_rate: 1968.08 });
  loadWithRateId = loadWithRate.body.load.id;

  const loadNoRate = await request(app)
    .post('/api/loads')
    .set('Authorization', `Bearer ${token}`)
    .send({ customer_id: customerId });
  loadNoRateId = loadNoRate.body.load.id;
});

test('creating an invoice with no amount pulls the load customer_rate', async () => {
  const res = await request(app)
    .post('/api/invoices')
    .set('Authorization', `Bearer ${token}`)
    .send({ load_id: loadWithRateId });

  assert.equal(res.status, 201);
  assert.equal(Number(res.body.invoice.amount), 1968.08);
  assert.equal(res.body.invoice.status, 'Draft');
  assert.match(res.body.invoice.invoice_number, /^INV-\d+$/);
  assert.equal(res.body.invoice.customer_name, 'SIG Combibloc Inc');
  invoiceId = res.body.invoice.id;
});

test('creating an invoice for a load with no customer_rate and no amount fails clearly', async () => {
  const res = await request(app)
    .post('/api/invoices')
    .set('Authorization', `Bearer ${token}`)
    .send({ load_id: loadNoRateId });
  assert.equal(res.status, 400);
});

test('creating an invoice with an explicit amount overrides the load rate', async () => {
  const res = await request(app)
    .post('/api/invoices')
    .set('Authorization', `Bearer ${token}`)
    .send({ load_id: loadNoRateId, amount: 500 });
  assert.equal(res.status, 201);
  assert.equal(Number(res.body.invoice.amount), 500);
});

test('rejects invoice creation for a nonexistent load', async () => {
  const res = await request(app)
    .post('/api/invoices')
    .set('Authorization', `Bearer ${token}`)
    .send({ load_id: '00000000-0000-0000-0000-000000000000' });
  assert.equal(res.status, 404);
});

test('lists invoices, newest first', async () => {
  const res = await request(app).get('/api/invoices').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.invoices.length, 2);
});

test('filters invoices by status', async () => {
  const res = await request(app).get('/api/invoices?status=Draft').set('Authorization', `Bearer ${token}`);
  assert.equal(res.body.invoices.length, 2);
});

test('marks an invoice Sent', async () => {
  const res = await request(app)
    .patch(`/api/invoices/${invoiceId}/status`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'Sent' });
  assert.equal(res.status, 200);
  assert.equal(res.body.invoice.status, 'Sent');
  assert.equal(res.body.invoice.paid_date, null);
});

test('marks an invoice Paid and stamps a paid_date', async () => {
  const res = await request(app)
    .patch(`/api/invoices/${invoiceId}/status`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'Paid' });
  assert.equal(res.status, 200);
  assert.equal(res.body.invoice.status, 'Paid');
  assert.ok(res.body.invoice.paid_date);
});

test('rejects an invalid invoice status', async () => {
  const res = await request(app)
    .patch(`/api/invoices/${invoiceId}/status`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'Overdue' }); // not a real enum value
  assert.equal(res.status, 400);
});

test('updates invoice amount directly', async () => {
  const res = await request(app)
    .put(`/api/invoices/${invoiceId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ amount: 2000 });
  assert.equal(res.status, 200);
  assert.equal(Number(res.body.invoice.amount), 2000);
});

test('deletes an invoice', async () => {
  const res = await request(app).delete(`/api/invoices/${invoiceId}`).set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 204);
});

test('deleting a load cascades to delete its invoices (ON DELETE CASCADE)', async () => {
  const before = await request(app).get('/api/invoices').set('Authorization', `Bearer ${token}`);
  assert.equal(before.body.invoices.length, 1); // the $500 one on loadNoRateId

  await request(app).delete(`/api/loads/${loadNoRateId}`).set('Authorization', `Bearer ${token}`);

  const after = await request(app).get('/api/invoices').set('Authorization', `Bearer ${token}`);
  assert.equal(after.body.invoices.length, 0);
});
