const { query } = require('../config/db');
const { ApiError } = require('../middleware/error.middleware');

const PERIODS = ['current_month', 'last_month', 'last_06_months'];

function periodBounds(period) {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth(); // 0-indexed

  if (period === 'current_month') {
    return { from: new Date(Date.UTC(y, m, 1)), to: new Date(Date.UTC(y, m + 1, 1)) };
  }
  if (period === 'last_month') {
    return { from: new Date(Date.UTC(y, m - 1, 1)), to: new Date(Date.UTC(y, m, 1)) };
  }
  if (period === 'last_06_months') {
    return { from: new Date(Date.UTC(y, m - 6, 1)), to: new Date(Date.UTC(y, m + 1, 1)) };
  }
  return null;
}

function validatePeriod(period) {
  if (period && !PERIODS.includes(period)) {
    throw new ApiError(400, `Invalid period. Use one of: ${PERIODS.join(', ')}`);
  }
  return period || 'current_month';
}

const STATUS_BUCKETS = {
  'Pending Pickup': ['New Load', 'Available for Pickup', 'Pickup Scheduled', 'At Port', 'Gate Out', 'Find Carrier', 'Carrier Assigned'],
  'In Transit': ['Picked Up', 'In Transit', 'Delivery Scheduled', 'At Delivery', 'Delivered', 'POD Pending', 'Empty Pending', 'Empty / POD Pending', 'Empty Return Scheduled', 'Empty Returned'],
  'Completed': ['Completed'],
  'Holds / Issues': ['Customs Hold', 'Freight Hold', 'Exam Site', 'Driver Delayed', 'Port Congestion', 'Cancelled']
};
function bucketForStatus(status) {
  for (const [bucket, statuses] of Object.entries(STATUS_BUCKETS)) {
    if (statuses.includes(status)) return bucket;
  }
  return 'Pending Pickup';
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * GET /api/dashboard/summary
 * The "Operational Dashboard" tab: stat cards + a weekly volume chart + a status breakdown.
 */
async function operationalSummary(req, res) {
  const { from, to } = periodBounds('current_month');

  // Monday of the current week, for the weekly volume chart.
  const now = new Date();
  const dow = now.getUTCDay(); // 0 = Sunday
  const daysSinceMonday = (dow + 6) % 7;
  const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceMonday));
  const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [
    monthlyLoads, findCarrier, completed, grossRevenue, availableForPickup,
    pendingCustomerInvoices, pendingCarrierPayments, weekLoads, allStatuses
  ] = await Promise.all([
    query(`SELECT COUNT(*)::int AS count FROM loads WHERE created_at >= $1 AND created_at < $2`, [from, to]),
    query(`SELECT COUNT(*)::int AS count FROM loads WHERE status = 'Find Carrier'`),
    query(`SELECT COUNT(*)::int AS count FROM loads WHERE status = 'Completed' AND created_at >= $1 AND created_at < $2`, [from, to]),
    query(`SELECT COALESCE(SUM(customer_charge), 0)::numeric AS total FROM loads WHERE created_at >= $1 AND created_at < $2`, [from, to]),
    query(`SELECT COUNT(*)::int AS count FROM loads WHERE status = 'Available for Pickup'`),
    query(`SELECT COUNT(*)::int AS count FROM invoices WHERE status NOT IN ('Paid', 'Void')`),
    query(`SELECT COUNT(*)::int AS count FROM loads WHERE carrier_rate IS NOT NULL AND carrier_pay_status != 'Done'`),
    query(`SELECT created_at FROM loads WHERE created_at >= $1 AND created_at < $2`, [weekStart, weekEnd]),
    query(`SELECT status FROM loads`)
  ]);

  const weeklyCounts = [0, 0, 0, 0, 0, 0, 0]; // Mon..Sun
  weekLoads.rows.forEach((r) => {
    const d = new Date(r.created_at).getUTCDay();
    weeklyCounts[(d + 6) % 7]++;
  });
  const weeklyVolume = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => ({ day, count: weeklyCounts[i] }));

  const bucketCounts = { 'Pending Pickup': 0, 'In Transit': 0, 'Completed': 0, 'Holds / Issues': 0 };
  allStatuses.rows.forEach((r) => { bucketCounts[bucketForStatus(r.status)]++; });
  const totalLoads = allStatuses.rows.length || 1;
  const statusBreakdown = Object.entries(bucketCounts).map(([label, count]) => ({
    label, count, pct: Math.round((count / totalLoads) * 100)
  }));

  res.json({
    monthlyLoads: monthlyLoads.rows[0].count,
    findCarrier: findCarrier.rows[0].count,
    completed: completed.rows[0].count,
    grossRevenue: Number(grossRevenue.rows[0].total),
    availableForPickup: availableForPickup.rows[0].count,
    pendingCustomerInvoices: pendingCustomerInvoices.rows[0].count,
    pendingCarrierPayments: pendingCarrierPayments.rows[0].count,
    weeklyVolume,
    statusBreakdown
  });
}

/**
 * GET /api/reports/summary?period=current_month|last_month|current_year|all_time
 * The "Reports & Analytics" financial summary: Revenue / Expenses / Net Margin
 * (same numbers the reference screenshots also label Gross Linehaul / Carrier
 * Payout / Operating Margin — one canonical calculation, two display names).
 */
async function financialSummary(req, res) {
  const period = validatePeriod(req.query.period);
  const bounds = periodBounds(period);

  const params = [];
  let where = '';
  if (bounds) {
    params.push(bounds.from, bounds.to);
    where = `WHERE created_at >= $1 AND created_at < $2`;
  }

  const { rows } = await query(
    `SELECT
       COALESCE(SUM(customer_charge), 0)::numeric AS revenue,
       COALESCE(SUM(carrier_rate), 0)::numeric AS expenses
     FROM loads ${where}`,
    params
  );

  const revenue = Number(rows[0].revenue);
  const expenses = Number(rows[0].expenses);
  const netMargin = revenue > 0 ? ((revenue - expenses) / revenue) * 100 : 0;

  res.json({
    period,
    totalRevenue: revenue,
    totalExpenses: expenses,
    netMarginPct: Math.round(netMargin * 10) / 10,
    // aliases matching the other screen's labels
    grossLinehaul: revenue,
    carrierPayout: expenses,
    operatingMarginPct: Math.round(netMargin * 10) / 10
  });
}

/**
 * GET /api/reports/user-wise?user_id=...&period=...
 */
async function userWiseReport(req, res) {
  const { user_id } = req.query;
  if (!user_id) throw new ApiError(400, 'user_id is required.');
  const period = validatePeriod(req.query.period);
  const bounds = periodBounds(period);

  const { rows: userRows } = await query('SELECT id, name, username FROM users WHERE id = $1', [user_id]);
  if (!userRows[0]) throw new ApiError(404, 'User not found.');

  const params = [user_id];
  let where = `WHERE dispatcher_user_id = $1`;
  if (bounds) {
    params.push(bounds.from, bounds.to);
    where += ` AND created_at >= $2 AND created_at < $3`;
  }

  const { rows: loadRows } = await query(
    `SELECT id, load_number, status, customer_charge, carrier_rate, created_at
       FROM loads ${where} ORDER BY created_at DESC`,
    params
  );

  const totalRevenue = loadRows.reduce((sum, l) => sum + (Number(l.customer_charge) || 0), 0);
  const totalCarrierPay = loadRows.reduce((sum, l) => sum + (Number(l.carrier_rate) || 0), 0);

  res.json({
    user: userRows[0],
    period,
    loadsCount: loadRows.length,
    totalRevenue,
    totalCarrierPay,
    grossProfit: totalRevenue - totalCarrierPay,
    loads: loadRows
  });
}

/**
 * GET /api/reports/export?period=...&format=csv|json
 * "Export to Excel" (CSV, opens fine in Excel) / feeds "Export to PDF" on the frontend.
 */
async function exportLoads(req, res) {
  const period = validatePeriod(req.query.period);
  const bounds = periodBounds(period);
  const format = req.query.format === 'json' ? 'json' : 'csv';

  const params = [];
  let where = '';
  if (bounds) {
    params.push(bounds.from, bounds.to);
    where = `WHERE l.created_at >= $1 AND l.created_at < $2`;
  }

  const { rows } = await query(
    `SELECT l.load_number, e.code AS entity_code, l.status, l.load_type,
            c.name AS customer_name, ca.name AS carrier_name,
            l.carrier_rate, l.customer_charge,
            (COALESCE(l.customer_charge,0) - COALESCE(l.carrier_rate,0)) AS gross_profit,
            l.pickup_date, l.delivery_date, l.created_at
       FROM loads l
       JOIN entities e ON e.id = l.entity_id
       LEFT JOIN customers c ON c.id = l.customer_id
       LEFT JOIN carriers ca ON ca.id = l.carrier_id
       ${where}
       ORDER BY l.created_at DESC`,
    params
  );

  if (format === 'json') {
    return res.json({ period, rows });
  }

  const header = ['Load #', 'Entity', 'Status', 'Type', 'Customer', 'Carrier', 'Carrier Rate', 'Customer Charge', 'Gross Profit', 'Pickup Date', 'Delivery Date'];
  const csvRows = rows.map((r) => [
    r.load_number, r.entity_code, r.status, r.load_type || '', r.customer_name || '', r.carrier_name || '',
    r.carrier_rate ?? '', r.customer_charge ?? '', r.gross_profit ?? '', r.pickup_date || '', r.delivery_date || ''
  ]);
  const csv = [header, ...csvRows].map((row) => row.map(csvEscape).join(',')).join('\r\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="loads_${period}.csv"`);
  res.send(csv);
}

function csvEscape(value) {
  const s = String(value ?? '');
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

module.exports = { operationalSummary, financialSummary, userWiseReport, exportLoads };
