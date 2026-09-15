const { query } = require('../config/db');
const { ApiError } = require('../middleware/error.middleware');

const SELECT_WITH_JOINS = `
  SELECT
    i.*,
    l.load_number, l.origin, l.container_number, l.bol_number,
    c.name AS customer_name, c.email AS customer_email, c.address AS customer_address, c.terms AS customer_terms
  FROM invoices i
  JOIN loads l ON l.id = i.load_id
  LEFT JOIN customers c ON c.id = i.customer_id
`;

async function list(req, res) {
  const { status } = req.query;
  const params = [];
  let where = '';
  if (status) {
    params.push(status);
    where = `WHERE i.status = $1`;
  }
  const { rows } = await query(`${SELECT_WITH_JOINS} ${where} ORDER BY i.created_at DESC`, params);
  res.json({ invoices: rows });
}

async function getOne(req, res) {
  const { rows } = await query(`${SELECT_WITH_JOINS} WHERE i.id = $1`, [req.params.id]);
  if (!rows[0]) throw new ApiError(404, 'Invoice not found.');
  res.json({ invoice: rows[0] });
}

/**
 * POST /api/invoices
 * Body: { load_id, amount?, due_date? }
 * If amount is omitted, it's taken from the load's customer_rate.
 * customer_id is resolved from the load automatically.
 */
async function create(req, res) {
  const { load_id, amount, due_date } = req.body;

  const { rows: loadRows } = await query('SELECT id, customer_id, customer_charge FROM loads WHERE id = $1', [load_id]);
  const load = loadRows[0];
  if (!load) throw new ApiError(404, 'Load not found.');

  const finalAmount = amount !== undefined && amount !== '' ? Number(amount) : load.customer_charge;
  if (finalAmount === null || finalAmount === undefined || Number.isNaN(finalAmount)) {
    throw new ApiError(400, 'This load has no customer rate set — provide an amount explicitly.');
  }

  const { rows: seqRows } = await query(`SELECT nextval('invoice_number_seq') AS n`);
  const invoiceNumber = `INV-${seqRows[0].n}`;
  const issuedDate = new Date().toISOString().slice(0, 10);

  const { rows } = await query(
    `INSERT INTO invoices (invoice_number, load_id, customer_id, amount, status, issued_date, due_date)
     VALUES ($1, $2, $3, $4, 'Not Sent', $5, $6)
     RETURNING id`,
    [invoiceNumber, load_id, load.customer_id, finalAmount, issuedDate, due_date || null]
  );

  const { rows: fullRows } = await query(`${SELECT_WITH_JOINS} WHERE i.id = $1`, [rows[0].id]);
  res.status(201).json({ invoice: fullRows[0] });
}

async function update(req, res) {
  const { amount, due_date } = req.body;
  const { rows } = await query(
    `UPDATE invoices SET amount = COALESCE($1, amount), due_date = COALESCE($2, due_date) WHERE id = $3 RETURNING id`,
    [amount === '' ? null : amount, due_date || null, req.params.id]
  );
  if (!rows[0]) throw new ApiError(404, 'Invoice not found.');
  const { rows: fullRows } = await query(`${SELECT_WITH_JOINS} WHERE i.id = $1`, [req.params.id]);
  res.json({ invoice: fullRows[0] });
}

/**
 * PATCH /api/invoices/:id/status
 * Body: { status: 'Not Sent' | 'Sent' | 'Paid' | 'Overdue' | 'Void' }
 */
async function setStatus(req, res) {
  const { status } = req.body;
  const today = new Date().toISOString().slice(0, 10);
  const paidDate = status === 'Paid' ? today : null;

  const { rows } = await query(
    `UPDATE invoices SET status = $1, paid_date = COALESCE($2, paid_date) WHERE id = $3 RETURNING id`,
    [status, paidDate, req.params.id]
  );
  if (!rows[0]) throw new ApiError(404, 'Invoice not found.');

  const { rows: fullRows } = await query(`${SELECT_WITH_JOINS} WHERE i.id = $1`, [req.params.id]);
  res.json({ invoice: fullRows[0] });
}

async function remove(req, res) {
  const { rows } = await query('DELETE FROM invoices WHERE id = $1 RETURNING id', [req.params.id]);
  if (!rows[0]) throw new ApiError(404, 'Invoice not found.');
  res.status(204).send();
}

module.exports = { list, getOne, create, update, setStatus, remove };
