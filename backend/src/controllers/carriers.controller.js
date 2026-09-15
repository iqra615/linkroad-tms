const { query } = require('../config/db');
const { ApiError } = require('../middleware/error.middleware');

async function list(req, res) {
  const { search, status } = req.query;
  const conditions = [];
  const params = [];

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(name ILIKE $${params.length} OR mc_number ILIKE $${params.length} OR dot_number ILIKE $${params.length})`);
  }
  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }
  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await query(`SELECT * FROM carriers ${where} ORDER BY name ASC`, params);
  res.json({ carriers: rows });
}

async function getOne(req, res) {
  const { rows } = await query('SELECT * FROM carriers WHERE id = $1', [req.params.id]);
  if (!rows[0]) throw new ApiError(404, 'Carrier not found.');
  res.json({ carrier: rows[0] });
}

async function create(req, res) {
  const { name, mc_number, dot_number, email, phone, city, state, dispatcher_name, status } = req.body;
  const { rows } = await query(
    `INSERT INTO carriers (name, mc_number, dot_number, email, phone, city, state, dispatcher_name, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, 'Active'))
     RETURNING *`,
    [name, mc_number || null, dot_number || null, email || null, phone || null, city || null, state || null, dispatcher_name || null, status || null]
  );
  res.status(201).json({ carrier: rows[0] });
}

async function update(req, res) {
  const { name, mc_number, dot_number, email, phone, city, state, dispatcher_name, status } = req.body;
  const { rows } = await query(
    `UPDATE carriers SET name = $1, mc_number = $2, dot_number = $3, email = $4, phone = $5,
       city = $6, state = $7, dispatcher_name = $8, status = $9
     WHERE id = $10 RETURNING *`,
    [name, mc_number || null, dot_number || null, email || null, phone || null, city || null, state || null, dispatcher_name || null, status || 'Active', req.params.id]
  );
  if (!rows[0]) throw new ApiError(404, 'Carrier not found.');
  res.json({ carrier: rows[0] });
}

async function remove(req, res) {
  const { rows } = await query('DELETE FROM carriers WHERE id = $1 RETURNING id', [req.params.id]);
  if (!rows[0]) throw new ApiError(404, 'Carrier not found.');
  res.status(204).send();
}

module.exports = { list, getOne, create, update, remove };
