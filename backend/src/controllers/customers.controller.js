const { query } = require('../config/db');
const { ApiError } = require('../middleware/error.middleware');

async function list(req, res) {
  const { search } = req.query;
  const params = [];
  let where = '';
  if (search) {
    params.push(`%${search}%`);
    where = `WHERE name ILIKE $1 OR email ILIKE $1`;
  }
  const { rows } = await query(
    `SELECT * FROM customers ${where} ORDER BY name ASC`,
    params
  );
  res.json({ customers: rows });
}

async function getOne(req, res) {
  const { rows } = await query('SELECT * FROM customers WHERE id = $1', [req.params.id]);
  if (!rows[0]) throw new ApiError(404, 'Customer not found.');
  res.json({ customer: rows[0] });
}

async function create(req, res) {
  const { name, email, address, terms } = req.body;
  const { rows } = await query(
    `INSERT INTO customers (name, email, address, terms)
     VALUES ($1, $2, $3, COALESCE($4, 'Net 30'))
     RETURNING *`,
    [name, email || null, address || null, terms || null]
  );
  res.status(201).json({ customer: rows[0] });
}

async function update(req, res) {
  const { name, email, address, terms } = req.body;
  const { rows } = await query(
    `UPDATE customers SET name = $1, email = $2, address = $3, terms = $4
     WHERE id = $5 RETURNING *`,
    [name, email || null, address || null, terms || 'Net 30', req.params.id]
  );
  if (!rows[0]) throw new ApiError(404, 'Customer not found.');
  res.json({ customer: rows[0] });
}

async function remove(req, res) {
  const { rows } = await query('DELETE FROM customers WHERE id = $1 RETURNING id', [req.params.id]);
  if (!rows[0]) throw new ApiError(404, 'Customer not found.');
  res.status(204).send();
}

module.exports = { list, getOne, create, update, remove };
