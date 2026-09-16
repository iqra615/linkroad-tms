const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { buildTestApp } = require('./setup');

const { app } = buildTestApp();
let token, entityId, dispatcherId;

test('setup: admin + entity + a dispatcher user + several loads this month', async () => {
  const reg = await request(app).post('/api/auth/register').send({ username: 'admin', password: 'admin123!', name: 'Admin' });
  token = reg.body.token;

  const entList = await request(app).get('/api/entities').set('Authorization', `Bearer ${token}`);
  entityId = entList.body.entities.find((e) => e.code === 'LRL').id;

  const dispatcher = await request(app).post('/api/users').set('Authorization', `Bearer ${token}`)
    .send({ username: 'jdispatch', password: 'password123', name: 'John Dispatcher', role: 'Dispatcher' });
  dispatcherId = dispatcher.body.user.id;

  // Load 1: assigned to John, priced both sides, status Find Carrier
  await request(app).post('/api/loads').set('Authorization', `Bearer ${token}`)
    .send({ entity_id: entityId, dispatcher_user_id: dispatcherId, carrier_rate: 1000, customer_charge: 1500, status: 'Find Carrier' });

  // Load 2: assigned to John, Completed
  await request(app).post('/api/loads').set('Authorization', `Bearer ${token}`)
    .send({ entity_id: entityId, dispatcher_user_id: dispatcherId, carrier_rate: 800, customer_charge: 1200, status: 'Completed', completed_date: new Date().toISOString().slice(0, 10) });

  // Load 3: unassigned, Available for Pickup
  await request(app).post('/api/loads').set('Authorization', `Bearer ${token}`)
    .send({ entity_id: entityId, carrier_rate: 500, customer_charge: 700 });
});

test('operational dashboard summary counts correctly', async () => {
  const res = await request(app).get('/api/dashboard/summary').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.monthlyLoads, 3);
  assert.equal(res.body.findCarrier, 1);
  assert.equal(res.body.completed, 1);
  assert.equal(res.body.grossRevenue, 1500 + 1200 + 700);
  assert.equal(res.body.availableForPickup, 1); // load 3, the unassigned one, keeps its default status
  assert.ok(Array.isArray(res.body.weeklyVolume) && res.body.weeklyVolume.length === 7);
  assert.deepEqual(res.body.weeklyVolume.map((d) => d.day), ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']);
  const totalFromWeekly = res.body.weeklyVolume.reduce((sum, d) => sum + d.count, 0);
  assert.equal(totalFromWeekly, 3); // all 3 loads were just created, so they land in this week
  assert.ok(Array.isArray(res.body.statusBreakdown) && res.body.statusBreakdown.length === 4);
  const totalFromBreakdown = res.body.statusBreakdown.reduce((sum, b) => sum + b.count, 0);
  assert.equal(totalFromBreakdown, 3);
});

test('financial summary computes revenue, expenses, and margin for current_month', async () => {
  const res = await request(app).get('/api/reports/summary?period=current_month').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.totalRevenue, 3400);
  assert.equal(res.body.totalExpenses, 2300);
  assert.equal(res.body.grossLinehaul, res.body.totalRevenue); // alias check
  assert.equal(res.body.carrierPayout, res.body.totalExpenses); // alias check
  assert.ok(res.body.netMarginPct > 30 && res.body.netMarginPct < 33);
});

test('financial summary for last_06_months includes current month data', async () => {
  const res = await request(app).get('/api/reports/summary?period=last_06_months').set('Authorization', `Bearer ${token}`);
  assert.equal(res.body.totalRevenue, 3400);
});

test('rejects an invalid period', async () => {
  const res = await request(app).get('/api/reports/summary?period=next_century').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 400);
});

test('user-wise report aggregates only that user\'s loads', async () => {
  const res = await request(app).get(`/api/reports/user-wise?user_id=${dispatcherId}&period=current_month`).set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.user.name, 'John Dispatcher');
  assert.equal(res.body.loadsCount, 2); // loads 1 and 2, not load 3 (unassigned)
  assert.equal(res.body.totalRevenue, 1500 + 1200);
  assert.equal(res.body.totalCarrierPay, 1000 + 800);
  assert.equal(res.body.grossProfit, 2700 - 1800);
});

test('user-wise report requires user_id', async () => {
  const res = await request(app).get('/api/reports/user-wise?period=current_month').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 400);
});

test('user-wise report 404s for an unknown user', async () => {
  const res = await request(app).get('/api/reports/user-wise?user_id=00000000-0000-0000-0000-000000000000').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 404);
});

test('export as JSON returns row data', async () => {
  const res = await request(app).get('/api/reports/export?period=current_month&format=json').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.equal(res.body.rows.length, 3);
  assert.ok(res.body.rows[0].load_number);
});

test('export as CSV returns a downloadable CSV file', async () => {
  const res = await request(app).get('/api/reports/export?period=current_month&format=csv').set('Authorization', `Bearer ${token}`);
  assert.equal(res.status, 200);
  assert.match(res.headers['content-type'], /text\/csv/);
  assert.match(res.headers['content-disposition'], /attachment/);
  const lines = res.text.trim().split('\r\n');
  assert.equal(lines.length, 4); // header + 3 rows
  assert.match(lines[0], /Load #,Entity,Status/);
});
