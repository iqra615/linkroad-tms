/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { pool } = require('../src/config/db');

async function migrate() {
  const schemaPath = path.join(__dirname, '..', 'sql', 'schema.sql');
  const triggersPath = path.join(__dirname, '..', 'sql', 'triggers.sql');

  console.log('Applying schema.sql ...');
  await pool.query(fs.readFileSync(schemaPath, 'utf8'));
  console.log('✔ Tables, sequences, and indexes created.');

  console.log('Applying triggers.sql ...');
  await pool.query(fs.readFileSync(triggersPath, 'utf8'));
  console.log('✔ updated_at triggers created.');

  await pool.end();
}

migrate().catch((err) => {
  console.error('✘ Migration failed:', err.message);
  process.exit(1);
});
