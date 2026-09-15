const { query } = require('../config/db');
const { ApiError } = require('../middleware/error.middleware');

// Outstanding balance = sum of that customer's invoices not yet Paid or Void.
const SELECT_WITH_BALANCE = `
  SELECT c.id, c.name, c.contact_name, c.phone, c.email, c.address, c.terms, c.created_at, c.updated_at,
    COALESCE(SUM(CASE WHEN i.status NOT IN ('Paid', 'Void') THEN i.amount ELSE 0 END), 0) AS outstanding_balance
  FROM customers c
  LEFT JOIN invoices i ON i.customer_id = c.id
`;
const GROUP_BY = 'GROUP BY c.id, c.name, c.contact_name, c.phone, c.email, c.address, c.terms, c.created_at, c.updated_at';

async function list(req, res) {
  const { search } = req.query;
  const params = [];
  let where = '';
  if (search) {
    params.push(`%${search}%`);
    where = `WHERE c.name ILIKE $1 OR c.contact_name ILIKE $1 OR c.email ILIKE $1`;
  }
  const { rows } = await query(`${SELECT_WITH_BALANCE} ${where} ${GROUP_BY} ORDER BY c.name ASC`, params);
  res.json({ customers: rows });
}

async function getOne(req, res) {
  const { rows } = await query(`${SELECT_WITH_BALANCE} WHERE c.id = $1 ${GROUP_BY}`, [req.params.id]);
  if (!rows[0]) throw new ApiError(404, 'Customer not found.');
  res.json({ customer: rows[0] });
}

async function create(req, res) {
  const { name, contact_name, phone, email, address, terms } = req.body;
  const { rows } = await query(
    `INSERT INTO customers (name, contact_name, phone, email, address, terms)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, 'Net 30'))
     RETURNING *`,
    [name, contact_name || null, phone || null, email || null, address || null, terms || null]
  );
  res.status(201).json({ customer: { ...rows[0], outstanding_balance: 0 } });
}

async function update(req, res) {
  const { name, contact_name, phone, email, address, terms } = req.body;
  const { rows } = await query(
    `UPDATE customers SET name = $1, contact_name = $2, phone = $3, email = $4, address = $5, terms = $6
     WHERE id = $7 RETURNING *`,
    [name, contact_name || null, phone || null, email || null, address || null, terms || 'Net 30', req.params.id]
  );
  if (!rows[0]) throw new ApiError(404, 'Customer not found.');
  const { rows: fullRows } = await query(`${SELECT_WITH_BALANCE} WHERE c.id = $1 ${GROUP_BY}`, [req.params.id]);
  res.json({ customer: fullRows[0] });
}

async function remove(req, res) {
  const { rows } = await query('DELETE FROM customers WHERE id = $1 RETURNING id', [req.params.id]);
  if (!rows[0]) throw new ApiError(404, 'Customer not found.');
  res.status(204).send();
}

module.exports = { list, getOne, create, update, remove };
