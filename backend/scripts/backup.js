/* eslint-disable no-console */
/**
 * Backs up every table in the database to a single timestamped JSON file.
 *
 * USAGE (run from your own computer, not from Render):
 *   cd backend
 *   DATABASE_URL="<paste your EXTERNAL database URL here>" npm run backup
 *
 * Where to find the External Database URL: Render dashboard -> your Postgres
 * service (linkroad-tms-db) -> Connections tab -> "External Database URL".
 * This is different from the Internal one used by the backend service itself
 * — the internal one only works from inside Render's network, so it won't
 * work from your laptop.
 *
 * Each run creates a new file in backend/backups/, named with the date and
 * time, so old backups are never overwritten. Keep a few recent ones; you
 * don't need to keep every single one forever.
 */
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const TABLES = ['entities', 'users', 'customers', 'carriers', 'consignees', 'loads', 'invoices'];

async function backup() {
  if (!process.env.DATABASE_URL) {
    console.error('✘ DATABASE_URL is not set.');
    console.error('  Run it like this: DATABASE_URL="postgresql://..." npm run backup');
    console.error('  Get the URL from Render -> linkroad-tms-db -> Connections -> External Database URL.');
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Render's external connections require SSL
  });

  const dump = { takenAt: new Date().toISOString(), tables: {} };

  console.log('Backing up database...');
  for (const table of TABLES) {
    const { rows } = await pool.query(`SELECT * FROM ${table}`);
    dump.tables[table] = rows;
    console.log(`  ✔ ${table}: ${rows.length} row(s)`);
  }

  const backupsDir = path.join(__dirname, '..', 'backups');
  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir);

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outPath = path.join(backupsDir, `backup-${stamp}.json`);
  fs.writeFileSync(outPath, JSON.stringify(dump, null, 2));

  console.log(`\n✔ Backup saved to: ${outPath}`);
  console.log('  Keep this file somewhere safe (e.g. copy it to a cloud drive) — it is NOT committed to git.');

  await pool.end();
}

backup().catch((err) => {
  console.error('✘ Backup failed:', err.message);
  process.exit(1);
});
