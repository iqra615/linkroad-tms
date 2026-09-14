const { query } = require('../config/db');
const { ApiError } = require('../middleware/error.middleware');

// Every list/get response joins in the human-readable names for the
// related customer/carrier/consignee so the frontend never has to
// stitch records together itself.
const SELECT_WITH_JOINS = `
  SELECT
    l.*,
    c.name  AS customer_name,
    ca.name AS carrier_name, ca.mc_number AS carrier_mc, ca.phone AS carrier_phone,
    ca.email AS carrier_email, ca.address AS carrier_address,
    co.name AS consignee_name, co.address AS consignee_address, co.contact AS consignee_contact
  FROM loads l
  LEFT JOIN customers  c  ON c.id  = l.customer_id
  LEFT JOIN carriers   ca ON ca.id = l.carrier_id
  LEFT JOIN consignees co ON co.id = l.consignee_id
`;

async function list(req, res) {
  const { search, status } = req.query;
  const conditions = [];
  const params = [];

  if (status) {
    params.push(status);
    conditions.push(`l.status = $${params.length}`);
  }
  if (search) {
    params.push(`%${search}%`);
    const p = `$${params.length}`;
    conditions.push(`(l.load_number ILIKE ${p} OR l.container_number ILIKE ${p} OR l.bol_number ILIKE ${p} OR c.name ILIKE ${p} OR ca.name ILIKE ${p})`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await query(`${SELECT_WITH_JOINS} ${where} ORDER BY l.created_at DESC`, params);
  res.json({ loads: rows });
}

async function getOne(req, res) {
  const { rows } = await query(`${SELECT_WITH_JOINS} WHERE l.id = $1`, [req.params.id]);
  if (!rows[0]) throw new ApiError(404, 'Load not found.');
  res.json({ load: rows[0] });
}

async function create(req, res) {
  const {
    customer_id, carrier_id, consignee_id, origin, container_number, bol_number,
    weight, equipment_type, commodity_desc, carrier_rate, customer_rate,
    status, pickup_date, delivery_date, notes
  } = req.body;

  let { load_number } = req.body;
  if (!load_number) {
    const { rows: seqRows } = await query(`SELECT nextval('load_number_seq') AS n`);
    load_number = `LRL-${seqRows[0].n}`;
  }

  const { rows } = await query(
    `INSERT INTO loads (
       load_number, customer_id, carrier_id, consignee_id, origin, container_number, bol_number,
       weight, equipment_type, commodity_desc, carrier_rate, customer_rate, status,
       pickup_date, delivery_date, notes, created_by
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,COALESCE($13,'Dispatched'),$14,$15,$16,$17)
     RETURNING id`,
    [
      load_number, customer_id || null, carrier_id || null, consignee_id || null, origin || null,
      container_number || null, bol_number || null, weight || null, equipment_type || null,
      commodity_desc || null, nullableNumber(carrier_rate), nullableNumber(customer_rate), status || null,
      pickup_date || null, delivery_date || null, notes || null, req.user.id
    ]
  );

  const { rows: fullRows } = await query(`${SELECT_WITH_JOINS} WHERE l.id = $1`, [rows[0].id]);
  res.status(201).json({ load: fullRows[0] });
}

async function update(req, res) {
  const {
    load_number, customer_id, carrier_id, consignee_id, origin, container_number, bol_number,
    weight, equipment_type, commodity_desc, carrier_rate, customer_rate,
    status, pickup_date, delivery_date, notes
  } = req.body;

  const { rows } = await query(
    `UPDATE loads SET
       load_number = $1, customer_id = $2, carrier_id = $3, consignee_id = $4, origin = $5,
       container_number = $6, bol_number = $7, weight = $8, equipment_type = $9, commodity_desc = $10,
       carrier_rate = $11, customer_rate = $12, status = $13, pickup_date = $14, delivery_date = $15, notes = $16
     WHERE id = $17
     RETURNING id`,
    [
      load_number, customer_id || null, carrier_id || null, consignee_id || null, origin || null,
      container_number || null, bol_number || null, weight || null, equipment_type || null,
      commodity_desc || null, nullableNumber(carrier_rate), nullableNumber(customer_rate),
      status || 'Dispatched', pickup_date || null, delivery_date || null, notes || null, req.params.id
    ]
  );
  if (!rows[0]) throw new ApiError(404, 'Load not found.');

  const { rows: fullRows } = await query(`${SELECT_WITH_JOINS} WHERE l.id = $1`, [req.params.id]);
  res.json({ load: fullRows[0] });
}

async function remove(req, res) {
  const { rows } = await query('DELETE FROM loads WHERE id = $1 RETURNING id', [req.params.id]);
  if (!rows[0]) throw new ApiError(404, 'Load not found.');
  res.status(204).send();
}

/**
 * PATCH /api/loads/:id/carrier-payment
 * Body: { status: 'Paid' | 'Unpaid' }
 */
async function setCarrierPayment(req, res) {
  const { status } = req.body;
  const paidDate = status === 'Paid' ? new Date().toISOString().slice(0, 10) : null;

  const { rows } = await query(
    `UPDATE loads SET carrier_pay_status = $1, carrier_paid_date = $2 WHERE id = $3 RETURNING id`,
    [status, paidDate, req.params.id]
  );
  if (!rows[0]) throw new ApiError(404, 'Load not found.');

  const { rows: fullRows } = await query(`${SELECT_WITH_JOINS} WHERE l.id = $1`, [req.params.id]);
  res.json({ load: fullRows[0] });
}

function nullableNumber(v) {
  if (v === '' || v === undefined || v === null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

module.exports = { list, getOne, create, update, remove, setCarrierPayment };
