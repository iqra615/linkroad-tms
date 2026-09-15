const { query } = require('../config/db');
const { ApiError } = require('../middleware/error.middleware');

// Every list/get response joins in human-readable names so the frontend
// never has to stitch records together itself.
const SELECT_WITH_JOINS = `
  SELECT
    l.*,
    e.code AS entity_code, e.name AS entity_name,
    c.name  AS customer_name,
    ca.name AS carrier_name, ca.mc_number AS carrier_mc, ca.dot_number AS carrier_dot,
    ca.phone AS carrier_phone, ca.email AS carrier_email,
    ca.city AS carrier_city, ca.state AS carrier_state, ca.dispatcher_name AS carrier_dispatcher_name,
    co.name AS consignee_name, co.address AS consignee_address, co.contact AS consignee_contact,
    u.name AS dispatcher_user_name
  FROM loads l
  JOIN entities   e  ON e.id  = l.entity_id
  LEFT JOIN customers  c  ON c.id  = l.customer_id
  LEFT JOIN carriers   ca ON ca.id = l.carrier_id
  LEFT JOIN consignees co ON co.id = l.consignee_id
  LEFT JOIN users      u  ON u.id  = l.dispatcher_user_id
`;

const ENTITY_SEQUENCES = {
  LRL: 'entity_lrl_load_seq',
  PIT: 'entity_pit_load_seq',
  EXP: 'entity_exp_load_seq'
};

async function list(req, res) {
  const { search, status, entity_id, load_type } = req.query;
  const conditions = [];
  const params = [];

  if (status) { params.push(status); conditions.push(`l.status = $${params.length}`); }
  if (entity_id) { params.push(entity_id); conditions.push(`l.entity_id = $${params.length}`); }
  if (load_type) { params.push(load_type); conditions.push(`l.load_type = $${params.length}`); }
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

async function generateLoadNumber(entityId) {
  const { rows: entityRows } = await query('SELECT code FROM entities WHERE id = $1', [entityId]);
  if (!entityRows[0]) throw new ApiError(400, 'Unknown entity.');
  const code = entityRows[0].code;
  const seqName = ENTITY_SEQUENCES[code];
  if (!seqName) throw new ApiError(400, `No load-number sequence configured for entity "${code}".`);
  const { rows: seqRows } = await query(`SELECT nextval('${seqName}') AS n`);
  return `${code}-${seqRows[0].n}`;
}

// Every column that can be set on create/update, other than load_number
// (handled specially) and created_by (server-controlled).
const FIELDS = [
  'entity_id', 'dispatcher_user_id', 'customer_id', 'carrier_id', 'consignee_id',
  'load_type', 'origin', 'deliver_to_address', 'empty_return_location',
  'container_number', 'container_type', 'bol_number', 'seal_number', 'reference_number', 'pickup_number',
  'weight', 'commodity_desc', 'packages_qty', 'packages_desc',
  'eta_date', 'lfd_date', 'pickup_date', 'delivery_date', 'empty_return_date', 'completed_date',
  'carrier_rate', 'customer_charge', 'status', 'notes'
];
const NUMERIC_FIELDS = new Set(['carrier_rate', 'customer_charge']);

function buildValues(body) {
  return FIELDS.map((f) => {
    const v = body[f];
    if (NUMERIC_FIELDS.has(f)) return nullableNumber(v);
    return v === undefined || v === '' ? null : v;
  });
}

async function create(req, res) {
  const { entity_id } = req.body;
  if (!entity_id) throw new ApiError(400, 'entity_id is required — every load belongs to one of the three companies.');

  let { load_number } = req.body;
  if (!load_number) load_number = await generateLoadNumber(entity_id);

  const body = { ...req.body, status: req.body.status || 'Available for Pickup' };
  const values = buildValues(body);
  const placeholders = FIELDS.map((_, i) => `$${i + 2}`).join(', ');

  const { rows } = await query(
    `INSERT INTO loads (load_number, ${FIELDS.join(', ')}, created_by)
     VALUES ($1, ${placeholders}, $${FIELDS.length + 2})
     RETURNING id`,
    [load_number, ...values, req.user.id]
  );

  const { rows: fullRows } = await query(`${SELECT_WITH_JOINS} WHERE l.id = $1`, [rows[0].id]);
  res.status(201).json({ load: fullRows[0] });
}

async function update(req, res) {
  const { load_number, status, completed_date } = req.body;

  // Status is only allowed to carry a completed_date once it's actually Completed —
  // mirrors "once status is Completed, then select date option will be active".
  const finalCompletedDate = status === 'Completed' ? (completed_date || null) : null;

  const values = buildValues({ ...req.body, status: status || 'Available for Pickup', completed_date: finalCompletedDate });
  const setClauses = FIELDS.map((f, i) => `${f} = $${i + 2}`).join(', ');

  const { rows } = await query(
    `UPDATE loads SET load_number = $1, ${setClauses} WHERE id = $${FIELDS.length + 2} RETURNING id`,
    [load_number, ...values, req.params.id]
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

/** PATCH /api/loads/:id/carrier-payment  Body: { status: 'Invoice Received' | 'Pending' | 'Done' } */
async function setCarrierPayment(req, res) {
  const { status } = req.body;
  const paidDate = status === 'Done' ? new Date().toISOString().slice(0, 10) : null;

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
