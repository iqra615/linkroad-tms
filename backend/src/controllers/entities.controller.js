const { query } = require('../config/db');
const { ApiError } = require('../middleware/error.middleware');

async function list(req, res) {
  const { rows } = await query('SELECT * FROM entities ORDER BY name ASC');
  res.json({ entities: rows });
}

async function getOne(req, res) {
  const { rows } = await query('SELECT * FROM entities WHERE id = $1', [req.params.id]);
  if (!rows[0]) throw new ApiError(404, 'Entity not found.');
  res.json({ entity: rows[0] });
}

async function update(req, res) {
  const { name, address, email, phone, website, logo_data_uri } = req.body;
  const { rows } = await query(
    `UPDATE entities SET name = $1, address = $2, email = $3, phone = $4, website = $5,
       logo_data_uri = COALESCE($6, logo_data_uri)
     WHERE id = $7 RETURNING *`,
    [name, address || null, email || null, phone || null, website || null, logo_data_uri || null, req.params.id]
  );
  if (!rows[0]) throw new ApiError(404, 'Entity not found.');
  res.json({ entity: rows[0] });
}

module.exports = { list, getOne, update };
