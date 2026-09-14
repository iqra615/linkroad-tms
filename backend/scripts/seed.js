/* eslint-disable no-console */
const { pool, query } = require('../src/config/db');
const { hashPassword } = require('../src/utils/auth');

async function seed() {
  console.log('Seeding database ...');

  // --- Admin user -------------------------------------------------
  const { rows: existingUsers } = await query('SELECT id FROM users WHERE username = $1', ['admin']);
  if (existingUsers.length === 0) {
    const passwordHash = await hashPassword('admin123');
    await query(
      `INSERT INTO users (username, password_hash, name, role) VALUES ($1, $2, $3, 'Administrator')`,
      ['admin', passwordHash, 'Admin']
    );
    console.log('✔ Created default admin user (admin / admin123) — change this password after first login.');
  } else {
    console.log('• Admin user already exists, skipping.');
  }

  // --- Sample carrier (from a real rate confirmation on file) ------
  let { rows: carrierRows } = await query('SELECT id FROM carriers WHERE name = $1', ['CC Cargo Express LLC']);
  if (carrierRows.length === 0) {
    const inserted = await query(
      `INSERT INTO carriers (name, mc_number, phone, email, address, status)
       VALUES ($1, $2, $3, $4, $5, 'Approved') RETURNING id`,
      ['CC Cargo Express LLC', '1561375', '(347) 370-0357', 'dispatch@cccargoexpress.com', '833 E Front St Apt A, Plainfield, NJ 07062']
    );
    carrierRows = inserted.rows;
    console.log('✔ Created sample carrier: CC Cargo Express LLC');
  } else {
    console.log('• Sample carrier already exists, skipping.');
  }

  // --- Sample consignee ---------------------------------------------
  let { rows: consigneeRows } = await query('SELECT id FROM consignees WHERE name = $1', ['Schindler Elevator Corp']);
  if (consigneeRows.length === 0) {
    const inserted = await query(
      `INSERT INTO consignees (name, address) VALUES ($1, $2) RETURNING id`,
      ['Schindler Elevator Corp', '700 Canal Road Ext, Suite 100, York, PA 17406']
    );
    consigneeRows = inserted.rows;
    console.log('✔ Created sample consignee: Schindler Elevator Corp');
  } else {
    console.log('• Sample consignee already exists, skipping.');
  }

  // --- Sample load (from the same real rate confirmation) -----------
  const { rows: loadRows } = await query('SELECT id FROM loads WHERE load_number = $1', ['LRL-1001']);
  if (loadRows.length === 0) {
    await query(
      `INSERT INTO loads (
         load_number, carrier_id, consignee_id, origin, container_number, bol_number,
         weight, equipment_type, carrier_rate, status, notes
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Dispatched',$10)`,
      [
        'LRL-1001', carrierRows[0].id, consigneeRows[0].id,
        'Maher Terminal, Berth 64, Corbin Street Bldg. 1210, Port Elizabeth, NJ 07201',
        'EITU8024846', 'EGLV142650881284', '12956.000 KG', '40HC', 1250,
        'Seeded from real rate confirmation on file. Add the bill-to customer and delivery date to complete this load.'
      ]
    );
    console.log('✔ Created sample load: LRL-1001');
  } else {
    console.log('• Sample load already exists, skipping.');
  }

  console.log('Done.');
  await pool.end();
}

seed().catch((err) => {
  console.error('✘ Seed failed:', err.message);
  process.exit(1);
});
