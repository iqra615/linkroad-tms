const { query } = require('../config/db');
const { ApiError } = require('../middleware/error.middleware');

async function list(req, res) {
  const { search } = req.query;
  const params = [];
  let where = '';
  if (search) {
    params.push(`%${search}%`);
    where = `WHERE name ILIKE $1`;
  }
  const { rows } = await query(`SELECT * FROM consignees ${where} ORDER BY name ASC`, params);
  res.json({ consignees: rows });
}

async function getOne(req, res) {
  const { rows } = await query('SELECT * FROM consignees WHERE id = $1', [req.params.id]);
  if (!rows[0]) throw new ApiError(404, 'Consignee not found.');
  res.json({ consignee: rows[0] });
}

async function create(req, res) {
  const { name, email, contact, address, important_emails } = req.body;
  const { rows } = await query(
    `INSERT INTO consignees (name, email, contact, address, important_emails) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [name, email || null, contact || null, address || null, important_emails || null]
  );
  res.status(201).json({ consignee: rows[0] });
}

async function update(req, res) {
  const { name, email, contact, address, important_emails } = req.body;
  const { rows } = await query(
    `UPDATE consignees SET name = $1, email = $2, contact = $3, address = $4, important_emails = $5 WHERE id = $6 RETURNING *`,
    [name, email || null, contact || null, address || null, important_emails || null, req.params.id]
  );
  if (!rows[0]) throw new ApiError(404, 'Consignee not found.');
  res.json({ consignee: rows[0] });
}

async function remove(req, res) {
  const { rows } = await query('DELETE FROM consignees WHERE id = $1 RETURNING id', [req.params.id]);
  if (!rows[0]) throw new ApiError(404, 'Consignee not found.');
  res.status(204).send();
}

module.exports = { list, getOne, create, update, remove };
