/* eslint-disable no-console */
/**
 * Restores a database from a backup file created by backup.js.
 *
 * By default this is a DRY RUN — it only tells you what it would do, and
 * changes nothing. This is deliberate: restoring is rare and risky, so it
 * should never happen by accident.
 *
 * USAGE:
 *   Dry run (safe, shows what would happen, changes nothing):
 *     DATABASE_URL="<external URL>" node scripts/restore.js backups/backup-2026-09-16.json
 *
 *   Actually restore (only after you've checked the dry run output):
 *     DATABASE_URL="<external URL>" node scripts/restore.js backups/backup-2026-09-16.json --confirm
 *
 * This restores by "upsert" — it inserts rows that don't exist and updates
 * rows that do, matched by their id. It does NOT delete anything currently
 * in the database that isn't in the backup file. If you truly need to wipe
 * the database back to exactly the backup's state (including removing rows
 * created after the backup), talk to Claude first — that's a different,
 * more dangerous operation than what this script does.
 */
const fs = require('fs');
const { Pool } = require('pg');

const TABLES = ['entities', 'users', 'customers', 'carriers', 'consignees', 'loads', 'invoices'];

async function restore() {
  const filePath = process.argv[2];
  const confirmed = process.argv.includes('--confirm');

  if (!filePath) {
    console.error('✘ Usage: node scripts/restore.js <path-to-backup.json> [--confirm]');
    process.exit(1);
  }
  if (!process.env.DATABASE_URL) {
    console.error('✘ DATABASE_URL is not set. Run with: DATABASE_URL="postgresql://..." node scripts/restore.js ...');
    process.exit(1);
  }

  const dump = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`Backup file taken at: ${dump.takenAt}`);
  console.log(confirmed ? 'Mode: LIVE — this will write to the database.' : 'Mode: DRY RUN — nothing will be changed.');
  console.log('');

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  for (const table of TABLES) {
    const rows = dump.tables[table] || [];
    if (!rows.length) { console.log(`${table}: 0 rows in backup, skipping.`); continue; }

    const columns = Object.keys(rows[0]);
    console.log(`${table}: ${rows.length} row(s) to restore${confirmed ? '' : ' (dry run — not written)'}`);

    if (!confirmed) continue;

    for (const row of rows) {
      const values = columns.map((c) => row[c]);
      const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
      const updateSet = columns.filter((c) => c !== 'id').map((c) => `${c} = EXCLUDED.${c}`).join(', ');
      await pool.query(
        `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders})
         ON CONFLICT (id) DO UPDATE SET ${updateSet}`,
        values
      );
    }
    console.log(`  ✔ ${table} restored.`);
  }

  await pool.end();
  console.log(confirmed ? '\n✔ Restore complete.' : '\nDry run complete — re-run with --confirm to actually restore.');
}

restore().catch((err) => {
  console.error('✘ Restore failed:', err.message);
  process.exit(1);
});
