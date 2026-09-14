const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { newDb, DataType } = require('pg-mem');

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';

/**
 * Builds a fresh in-memory database + Express app for a single test file.
 * Call this once per test file (not per test) so each file gets an
 * isolated database — tests within a file share state, same as hitting
 * a real dev database across requests in one session.
 */
function buildTestApp() {
  const db = newDb({ autoCreateForeignKeyIndices: true });

  db.registerExtension('pgcrypto', (schema) => {
    schema.registerFunction({
      name: 'gen_random_uuid',
      returns: DataType.uuid,
      implementation: () => crypto.randomUUID(),
      impure: true
    });
  });

  const schemaSql = fs.readFileSync(path.join(__dirname, '..', 'sql', 'schema.sql'), 'utf8');
  db.public.none(schemaSql);

  const { Pool } = db.adapters.createPg();
  global.__TEST_PG_POOL__ = new Pool();

  // Both config/db.js and app.js must be required AFTER the pool global is set,
  // and fresh each time (bypassing require's cache) so every test file gets
  // its own isolated database instead of accidentally sharing one.
  decacheModule('../src/config/db.js');
  decacheModule('../src/app.js');
  // Also decache everything under src/ that might have cached the old pool indirectly.
  Object.keys(require.cache).forEach((key) => {
    if (key.includes(`${path.sep}src${path.sep}`)) delete require.cache[key];
  });

  const { createApp } = require('../src/app');
  const app = createApp();
  return { app, db };
}

function decacheModule(relativePath) {
  const resolved = path.join(__dirname, relativePath);
  delete require.cache[require.resolve(resolved)];
}

module.exports = { buildTestApp };
