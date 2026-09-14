const env = require('./env');

let pool;

// The automated test suite (test/) runs against pg-mem, an in-memory
// PostgreSQL-compatible engine, so CI and local `npm test` never need a
// real database. It injects a ready-made pool via this global before
// requiring the app. Nothing in a real deployment ever sets this global,
// so production and development always use the real `pg` driver below.
if (env.nodeEnv === 'test' && global.__TEST_PG_POOL__) {
  pool = global.__TEST_PG_POOL__;
} else {
  const { Pool } = require('pg');
  const poolConfig = env.db.connectionString
    ? { connectionString: env.db.connectionString, ssl: env.db.ssl }
    : {
        host: env.db.host,
        port: env.db.port,
        user: env.db.user,
        password: env.db.password,
        database: env.db.database,
        ssl: env.db.ssl
      };
  pool = new Pool(poolConfig);

  pool.on('error', (err) => {
    // Catches errors on idle clients so they don't crash the process.
    // eslint-disable-next-line no-console
    console.error('Unexpected error on idle PostgreSQL client', err);
  });
}

/**
 * Run a query using the shared pool. Prefer this for simple, single-statement queries.
 */
async function query(text, params) {
  return pool.query(text, params);
}

/**
 * Run a callback inside a transaction. The callback receives a client and
 * must use it (not the pool) for every query so all statements share one
 * transaction. Automatically commits on success and rolls back on error.
 */
async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, withTransaction };
