const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { buildTestApp } = require('./setup');

const { app } = buildTestApp();
let token;
let carrierId, customerId, consigneeId, loadId;

test('setup: admin + related records', async () => {
  const reg = await request(app)
    .post('/api/auth/register')
    .send({ username: 'admin', password: 'admin123!', name: 'Admin' });
  token = reg.body.token;

  const carrier = await request(app)
    .post('/api/carriers')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'CC Cargo Express LLC', mc_number: '1561375' });
  carrierId = carrier.body.carrier.id;

  const customer = await request(app)
    .post('/api/customers')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Schindler Elevator Corp' });
  customerId = customer.body.customer.id;

  const consignee = await request(app)
    .post('/api/consignees')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Schindler Elevator Corp', address: '700 Canal Road Ext, York, PA' });
  consigneeId = consignee.body.consignee.id;
});

test('creates a load without specifying load_number (auto-generated)', async () => {
  const res = await request(app)
    .post('/api/loads')
    .set('Authorization', `Bearer ${token}`)
    .send({
      carrier_id: carrierId,
      customer_id: customerId,
      consignee_id: consigneeId,
      origin: 'Maher Terminal, Port Elizabeth, NJ',
      container_number: 'EITU8024846',
      bol_number: 'EGLV142650881284',
      weight: '12956.000 KG',
      equipment_type: '40HC',
      carrier_rate: 1250,
      customer_rate: 1850
    });

  assert.equal(res.status, 201);
  assert.match(res.body.load.load_number, /^LRL-\d+$/);
  assert.equal(res.body.load.carrier_name, 'CC Cargo Express LLC');
  assert.equal(res.body.load.consignee_name, 'Schindler Elevator Corp');
  assert.equal(Number(res.body.load.carrier_rate), 1250);
  loadId = res.body.load.id;
});

test('rejects an invalid status', async () => {
  const res = await request(app)
    .post('/api/loads')
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'MadeUpStatus' });
  assert.equal(res.status, 400);
});

test('rejects a negative carrier_rate', async () => {
  const res = await request(app)
    .post('/api/loads')
    .set('Authorization', `Bearer ${token}`)
    .send({ carrier_rate: -50 });
  assert.equal(res.status, 400);
});

test('second load gets the next sequence number', async () => {
  const res = await request(app).post('/api/loads').set('Authorization', `Bearer ${token}`).send({});
  const firstNum = parseInt(res.body.load.load_number.split('-')[1], 10);

  const first = await request(app).get(`/api/loads/${loadId}`).set('Authorization', `Bearer ${token}`);
  const firstLoadNum = parseInt(first.body.load.load_number.split('-')[1], 10);

  assert.equal(firstNum, firstLoadNum + 1);
});

test('lists loads with joined names, most recent first', async () => {
  const res = await request(app).get('/api/loads').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.loads.length, 2);
  assert.ok(res.body.loads[0].created_at >= res.body.loads[1].created_at);
});

test('filters loads by status', async () => {
  const res = await request(app).get('/api/loads?status=Dispatched').set('Authorization', `Bearer ${token}`);
  assert.equal(res.body.loads.length, 2); // default status on create is Dispatched
});

test('searches loads by container number', async () => {
  const res = await request(app).get('/api/loads?search=EITU8024846').set('Authorization', `Bearer ${token}`);
  assert.equal(res.body.loads.length, 1);
  assert.equal(res.body.loads[0].id, loadId);
});

test('updates a load', async () => {
  const res = await request(app)
    .put(`/api/loads/${loadId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      load_number: 'LRL-1001',
      status: 'In Transit',
      carrier_rate: 1250,
      customer_rate: 1900
    });
  assert.equal(res.status, 200);
  assert.equal(res.body.load.status, 'In Transit');
  assert.equal(Number(res.body.load.customer_rate), 1900);
});

test('404s updating a load that does not exist', async () => {
  const res = await request(app)
    .put('/api/loads/00000000-0000-0000-0000-000000000000')
    .set('Authorization', `Bearer ${token}`)
    .send({ load_number: 'LRL-9999', status: 'Dispatched' });
  assert.equal(res.status, 404);
});

test('marks a load carrier payment as Paid, sets a paid date', async () => {
  const res = await request(app)
    .patch(`/api/loads/${loadId}/carrier-payment`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'Paid' });

  assert.equal(res.status, 200);
  assert.equal(res.body.load.carrier_pay_status, 'Paid');
  assert.ok(res.body.load.carrier_paid_date);
});

test('marking Unpaid clears the paid date', async () => {
  const res = await request(app)
    .patch(`/api/loads/${loadId}/carrier-payment`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'Unpaid' });

  assert.equal(res.status, 200);
  assert.equal(res.body.load.carrier_pay_status, 'Unpaid');
  assert.equal(res.body.load.carrier_paid_date, null);
});

test('rejects an invalid carrier-payment status', async () => {
  const res = await request(app)
    .patch(`/api/loads/${loadId}/carrier-payment`)
    .set('Authorization', `Bearer ${token}`)
    .send({ status: 'HalfPaid' });
  assert.equal(res.status, 400);
});

test('deleting a carrier referenced by a load sets carrier_id to NULL (ON DELETE SET NULL)', async () => {
  await request(app).delete(`/api/carriers/${carrierId}`).set('Authorization', `Bearer ${token}`);
  const res = await request(app).get(`/api/loads/${loadId}`).set('Authorization', `Bearer ${token}`);
  assert.equal(res.body.load.carrier_id, null);
  assert.equal(res.body.load.carrier_name, null);
});

test('deletes a load', async () => {
  const res = await request(app).delete(`/api/loads/${loadId}`).set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 204);
});
