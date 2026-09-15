const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { buildTestApp } = require('./setup');

const { app } = buildTestApp();
let token;
let entities = {};
let carrierId, customerId, consigneeId, dispatcherUserId;
let lrlLoadId;

test('setup: admin + entities + related records', async () => {
  const reg = await request(app).post('/api/auth/register').send({ username: 'admin', password: 'admin123!', name: 'Admin' });
  token = reg.body.token;

  const entList = await request(app).get('/api/entities').set('Authorization', `Bearer ${token}`);
  entList.body.entities.forEach((e) => { entities[e.code] = e.id; });
  assert.ok(entities.LRL && entities.PIT && entities.EXP);

  const carrier = await request(app).post('/api/carriers').set('Authorization', `Bearer ${token}`).send({ name: 'CC Cargo Express LLC' });
  carrierId = carrier.body.carrier.id;

  const customer = await request(app).post('/api/customers').set('Authorization', `Bearer ${token}`).send({ name: 'Schindler Elevator Corp' });
  customerId = customer.body.customer.id;

  const consignee = await request(app).post('/api/consignees').set('Authorization', `Bearer ${token}`).send({ name: 'Schindler Elevator Corp', address: '700 Canal Road Ext, York, PA' });
  consigneeId = consignee.body.consignee.id;

  const dispatcher = await request(app).post('/api/users').set('Authorization', `Bearer ${token}`).send({ username: 'jdispatch', password: 'password123', name: 'John Dispatcher', role: 'Dispatcher' });
  dispatcherUserId = dispatcher.body.user.id;
});

test('rejects a load with no entity_id', async () => {
  const res = await request(app).post('/api/loads').set('Authorization', `Bearer ${token}`).send({ origin: 'Nowhere' });
  assert.equal(res.status, 400);
});

test('creates a Link Road load — gets an LRL- prefixed number', async () => {
  const res = await request(app)
    .post('/api/loads')
    .set('Authorization', `Bearer ${token}`)
    .send({
      entity_id: entities.LRL, carrier_id: carrierId, customer_id: customerId, consignee_id: consigneeId,
      dispatcher_user_id: dispatcherUserId, load_type: 'Import',
      origin: 'Maher Terminal, Port Elizabeth, NJ', container_number: 'EITU8024846', bol_number: 'EGLV142650881284',
      weight: '12956.000 KG', container_type: '40 High Cube (40HC)', carrier_rate: 1250, customer_charge: 1850
    });

  assert.equal(res.status, 201);
  assert.match(res.body.load.load_number, /^LRL-\d+$/);
  assert.equal(res.body.load.entity_code, 'LRL');
  assert.equal(res.body.load.carrier_name, 'CC Cargo Express LLC');
  assert.equal(res.body.load.dispatcher_user_name, 'John Dispatcher');
  assert.equal(res.body.load.status, 'Available for Pickup'); // default
  lrlLoadId = res.body.load.id;
});

test('creates a Prime load — gets a PIT- prefixed number, independent from LRL sequence', async () => {
  const res = await request(app)
    .post('/api/loads')
    .set('Authorization', `Bearer ${token}`)
    .send({ entity_id: entities.PIT, load_type: 'Export' });
  assert.equal(res.status, 201);
  assert.match(res.body.load.load_number, /^PIT-\d+$/);
  assert.equal(res.body.load.entity_code, 'PIT');
});

test('creates an Express load — gets an EXP- prefixed number', async () => {
  const res = await request(app)
    .post('/api/loads')
    .set('Authorization', `Bearer ${token}`)
    .send({
      entity_id: entities.EXP, load_type: 'Import', seal_number: 'SEAL123',
      reference_number: '4700772572, 4700775043', pickup_number: 'PU-99',
      packages_qty: '23', packages_desc: 'General Cargo - 843131'
    });
  assert.equal(res.status, 201);
  assert.match(res.body.load.load_number, /^EXP-\d+$/);
  assert.equal(res.body.load.seal_number, 'SEAL123');
  assert.equal(res.body.load.packages_qty, '23');
});

test('rejects an invalid status', async () => {
  const res = await request(app).post('/api/loads').set('Authorization', `Bearer ${token}`).send({ entity_id: entities.LRL, status: 'MadeUpStatus' });
  assert.equal(res.status, 400);
});

test('rejects an invalid load_type', async () => {
  const res = await request(app).post('/api/loads').set('Authorization', `Bearer ${token}`).send({ entity_id: entities.LRL, load_type: 'Domestic' });
  assert.equal(res.status, 400);
});

test('lists all loads across entities, newest first', async () => {
  const res = await request(app).get('/api/loads').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.loads.length, 3);
});

test('filters loads by entity_id', async () => {
  const res = await request(app).get(`/api/loads?entity_id=${entities.EXP}`).set('Authorization', `Bearer ${token}`);
  assert.equal(res.body.loads.length, 1);
  assert.equal(res.body.loads[0].entity_code, 'EXP');
});

test('filters loads by status', async () => {
  const res = await request(app).get('/api/loads?status=' + encodeURIComponent('Available for Pickup')).set('Authorization', `Bearer ${token}`);
  assert.equal(res.body.loads.length, 3); // all default to this status
});

test('filters loads by load_type', async () => {
  const res = await request(app).get('/api/loads?load_type=Export').set('Authorization', `Bearer ${token}`);
  assert.equal(res.body.loads.length, 1);
});

test('updating status to Completed stores the completed_date', async () => {
  const res = await request(app)
    .put(`/api/loads/${lrlLoadId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({
      entity_id: entities.LRL, load_number: 'LRL-KEEP', status: 'Completed', completed_date: '2026-08-28',
      carrier_rate: 1250, customer_charge: 1850
    });
  assert.equal(res.status, 200);
  assert.equal(res.body.load.status, 'Completed');
  assert.equal(res.body.load.completed_date.slice(0, 10), '2026-08-28');
});

test('completed_date is ignored/cleared unless status is Completed', async () => {
  const res = await request(app)
    .put(`/api/loads/${lrlLoadId}`)
    .set('Authorization', `Bearer ${token}`)
    .send({ entity_id: entities.LRL, load_number: 'LRL-KEEP', status: 'In Transit', completed_date: '2026-09-01' });
  assert.equal(res.status, 200);
  assert.equal(res.body.load.status, 'In Transit');
  assert.equal(res.body.load.completed_date, null);
});

test('marks carrier payment Done then Pending', async () => {
  let res = await request(app).patch(`/api/loads/${lrlLoadId}/carrier-payment`).set('Authorization', `Bearer ${token}`).send({ status: 'Done' });
  assert.equal(res.body.load.carrier_pay_status, 'Done');
  assert.ok(res.body.load.carrier_paid_date);

  res = await request(app).patch(`/api/loads/${lrlLoadId}/carrier-payment`).set('Authorization', `Bearer ${token}`).send({ status: 'Pending' });
  assert.equal(res.body.load.carrier_pay_status, 'Pending');
  assert.equal(res.body.load.carrier_paid_date, null);
});

test('rejects an invalid carrier-payment status', async () => {
  const res = await request(app).patch(`/api/loads/${lrlLoadId}/carrier-payment`).set('Authorization', `Bearer ${token}`).send({ status: 'Unpaid' });
  assert.equal(res.status, 400);
});

test('deletes a load', async () => {
  const res = await request(app).delete(`/api/loads/${lrlLoadId}`).set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 204);
});
