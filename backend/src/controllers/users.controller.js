const { query } = require('../config/db');
const { hashPassword } = require('../utils/auth');
const { ApiError } = require('../middleware/error.middleware');

const PUBLIC_FIELDS = 'id, username, name, role, created_at, updated_at';

async function list(req, res) {
  const { rows } = await query(`SELECT ${PUBLIC_FIELDS} FROM users ORDER BY created_at ASC`);
  res.json({ users: rows });
}

async function create(req, res) {
  const { username, password, name, role } = req.body;
  const passwordHash = await hashPassword(password);
  const { rows } = await query(
    `INSERT INTO users (username, password_hash, name, role)
     VALUES ($1, $2, $3, $4)
     RETURNING ${PUBLIC_FIELDS}`,
    [username.toLowerCase(), passwordHash, name, role]
  );
  res.status(201).json({ user: rows[0] });
}

async function update(req, res) {
  const { id } = req.params;
  const { name, role, password } = req.body;

  const fields = [];
  const values = [];
  let i = 1;

  if (name !== undefined) { fields.push(`name = $${i++}`); values.push(name); }
  if (role !== undefined) { fields.push(`role = $${i++}`); values.push(role); }
  if (password) { fields.push(`password_hash = $${i++}`); values.push(await hashPassword(password)); }

  if (!fields.length) throw new ApiError(400, 'No fields to update.');

  values.push(id);
  const { rows } = await query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${i} RETURNING ${PUBLIC_FIELDS}`,
    values
  );
  if (!rows[0]) throw new ApiError(404, 'User not found.');
  res.json({ user: rows[0] });
}

async function remove(req, res) {
  const { id } = req.params;
  if (id === req.user.id) throw new ApiError(400, 'You cannot delete your own account.');

  const { rows: countRows } = await query('SELECT COUNT(*)::int AS count FROM users WHERE role = $1', ['Administrator']);
  const { rows: targetRows } = await query('SELECT role FROM users WHERE id = $1', [id]);
  if (!targetRows[0]) throw new ApiError(404, 'User not found.');
  if (targetRows[0].role === 'Administrator' && countRows[0].count <= 1) {
    throw new ApiError(400, 'Cannot delete the last administrator.');
  }

  await query('DELETE FROM users WHERE id = $1', [id]);
  res.status(204).send();
}

module.exports = { list, create, update, remove };
