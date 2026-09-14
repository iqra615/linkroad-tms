const { query } = require('../config/db');

async function summary(req, res) {
  const [activeLoads, carrierCount, customerCount, margin, ar, ap] = await Promise.all([
    query(`SELECT COUNT(*)::int AS count FROM loads WHERE status NOT IN ('Delivered','Cancelled')`),
    query(`SELECT COUNT(*)::int AS count FROM carriers`),
    query(`SELECT COUNT(*)::int AS count FROM customers`),
    query(`SELECT COALESCE(SUM(customer_rate - carrier_rate), 0)::numeric AS total
             FROM loads WHERE customer_rate IS NOT NULL AND carrier_rate IS NOT NULL`),
    query(`SELECT COALESCE(SUM(amount), 0)::numeric AS total FROM invoices WHERE status IN ('Draft','Sent')`),
    query(`SELECT COALESCE(SUM(carrier_rate), 0)::numeric AS total FROM loads WHERE carrier_pay_status = 'Unpaid' AND carrier_rate IS NOT NULL`)
  ]);

  res.json({
    activeLoads: activeLoads.rows[0].count,
    carriers: carrierCount.rows[0].count,
    customers: customerCount.rows[0].count,
    grossMargin: Number(margin.rows[0].total),
    outstandingReceivables: Number(ar.rows[0].total),
    unpaidToCarriers: Number(ap.rows[0].total)
  });
}

module.exports = { summary };
