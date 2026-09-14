const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { buildTestApp } = require('./setup');

const { app } = buildTestApp();
let token;

test('setup: admin + a carrier + a customer + one fully-priced load + one unpaid carrier load', async () => {
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ username: 'admin', password: 'admin123!', name: 'Admin' });
  token = reg.body.token;

  await request(app).post('/api/carriers').set('Authorization', `Bearer ${token}`).send({ name: 'Carrier A' });
  await request(app).post('/api/carriers').set('Authorization', `Bearer ${token}`).send({ name: 'Carrier B' });
  await request(app).post('/api/customers').set('Authorization', `Bearer ${token}`).send({ name: 'Customer A' });

  // Load 1: priced both sides, still active (Dispatched) -> contributes to margin + AP
  await request(app)
    .post('/api/loads')
    .set('Authorization', `Bearer ${token}`)
    .send({ carrier_rate: 1000, customer_rate: 1500, status: 'Dispatched' });

  // Load 2: delivered -> should NOT count toward "active loads"
  await request(app)
    .post('/api/loads')
    .set('Authorization', `Bearer ${token}`)
    .send({ carrier_rate: 800, customer_rate: 1200, status: 'Delivered' });
});

test('dashboard summary aggregates correctly', async () => {
  const res = await request(app).get('/api/dashboard/summary').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);

  assert.equal(res.body.activeLoads, 1); // only the Dispatched one
  assert.equal(res.body.carriers, 2);
  assert.equal(res.body.customers, 1);
  assert.equal(res.body.grossMargin, 500 + 400); // (1500-1000) + (1200-800), margin counts all priced loads regardless of status
  assert.equal(res.body.unpaidToCarriers, 1000 + 800); // both unpaid by default
  assert.equal(res.body.outstandingReceivables, 0); // no invoices created yet
});

test('unpaidToCarriers drops after marking one load paid', async () => {
  const loads = await request(app).get('/api/loads').set('Authorization', `Bearer ${token}`);
  const dispatched = loads.body.loads.find((l) => l.status === 'Dispatched');

  await request(app)
    .patch(`/api/loads/${dispatched.id}/carrier-payment`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'Paid' });

  const res = await request(app).get('/api/dashboard/summary').set('Authorization', `Bearer ${token}`);
  assert.equal(res.body.unpaidToCarriers, 800);
});

test('outstandingReceivables reflects Draft/Sent invoices but not Paid ones', async () => {
  const loads = await request(app).get('/api/loads').set('Authorization', `Bearer ${token}`);
  const loadId = loads.body.loads[0].id;

  const inv = await request(app)
    .post('/api/invoices')
    .set('Authorization', `Bearer ${token}`)
    .send({ load_id: loadId, amount: 300 });

  let res = await request(app).get('/api/dashboard/summary').set('Authorization', `Bearer ${token}`);
  assert.equal(res.body.outstandingReceivables, 300);

  await request(app)
    .patch(`/api/invoices/${inv.body.invoice.id}/status`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'Paid' });

  res = await request(app).get('/api/dashboard/summary').set('Authorization', `Bearer ${token}`);
  assert.equal(res.body.outstandingReceivables, 0);
});
