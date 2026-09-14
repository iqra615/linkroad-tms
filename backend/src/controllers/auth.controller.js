const { query } = require('../config/db');
const { hashPassword, verifyPassword, signToken } = require('../utils/auth');
const { ApiError } = require('../middleware/error.middleware');

const PUBLIC_FIELDS = 'id, username, name, role, created_at';

/**
 * POST /api/auth/register
 * Open registration is intentionally restricted: the very first account
 * becomes an Administrator for free; every account after that must be
 * created by an existing Administrator via POST /api/users.
 */
async function register(req, res) {
  const { username, password, name } = req.body;

  const { rows: existingUsers } = await query('SELECT id FROM users LIMIT 1');
  if (existingUsers.length > 0) {
    throw new ApiError(403, 'Registration is closed. Ask an administrator to create your account from the Users tab.');
  }

  const passwordHash = await hashPassword(password);
  const { rows } = await query(
    `INSERT INTO users (username, password_hash, name, role)
     VALUES ($1, $2, $3, 'Administrator')
     RETURNING ${PUBLIC_FIELDS}`,
    [username.toLowerCase(), passwordHash, name]
  );

  const user = rows[0];
  const token = signToken(user);
  res.status(201).json({ user, token });
}

/**
 * POST /api/auth/login
 */
async function login(req, res) {
  const { username, password } = req.body;

  const { rows } = await query('SELECT * FROM users WHERE username = $1', [username.toLowerCase()]);
  const user = rows[0];

  // Compare against a dummy hash even when the user doesn't exist, so
  // login timing doesn't reveal whether a username is registered.
  const hashToCheck = user ? user.password_hash : '$2a$12$C6UzMDM.H6dfI/f/IKco8O.MOEjX3zpF6VG1e6h7QeS2CqvSb1TXO';
  const passwordOk = await verifyPassword(password, hashToCheck);

  if (!user || !passwordOk) {
    throw new ApiError(401, 'Invalid username or password.');
  }

  const publicUser = { id: user.id, username: user.username, name: user.name, role: user.role, created_at: user.created_at };
  const token = signToken(publicUser);
  res.json({ user: publicUser, token });
}

/**
 * GET /api/auth/me
 */
async function me(req, res) {
  const { rows } = await query(`SELECT ${PUBLIC_FIELDS} FROM users WHERE id = $1`, [req.user.id]);
  if (!rows[0]) throw new ApiError(404, 'User not found.');
  res.json({ user: rows[0] });
}

module.exports = { register, login, me };
