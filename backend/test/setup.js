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

  // Real deployments always run `npm run seed` after `npm run migrate`, which
  // creates the 3 fixed operating entities (there's no create-entity API by
  // design — they're a closed set). Mirror that here so every test file sees
  // the same baseline every real environment has.
  db.public.none(`
    INSERT INTO entities (code, name, address, email, phone, website) VALUES
      ('LRL', 'Link Road Logistics Inc.', '16192 Coastal Hwy, Lewes, DE 19958', 'dispatch@linkroadlogistics.com', '267-283-9370', 'linkroadlogistics.com'),
      ('EXP', 'Express Intermodal Transportation Inc', '1741 Valley Forge Rd, SUITE # 262, Worcester, PA 19490', 'dispatch@expressintermodal.net', NULL, 'expressintermodal.net'),
      ('PIT', 'Prime Intermodal Transportation', NULL, NULL, NULL, NULL);
  `);

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
