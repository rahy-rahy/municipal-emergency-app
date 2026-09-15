'use strict';

const db = require('./db/pool');
const auth = require('./auth');
const config = require('./config');

const DEMO_PASSWORD = 'demo1234';

const demoUsers = [
  { email: 'admin@admin.metn.gov.lb', name: 'Town Admin', role: 'admin', status: 'verified' },
  { email: 'support@staff.metn.gov.lb', name: 'Operator One', role: 'support', status: 'verified' },
  { email: 'resident@example.com', name: 'Verified Resident', role: 'resident', status: 'verified' },
  { email: 'pending@example.com', name: 'Pending Resident', role: 'resident', status: 'pending' }
];

async function countUsers() {
  const row = await db.one('SELECT count(*)::int AS n FROM users');
  return row.n;
}

// Inserts demo rows if the users table is empty. Only runs in demo mode,
// so a real production database never gets demo accounts.
async function seedIfEmpty() {
  if (!config.demoMode) {
    console.log('Demo mode is off. Skipping demo seed.');
    return false;
  }
  if ((await countUsers()) > 0) {
    console.log('Users already present. Skipping seed.');
    return false;
  }
  await seedNow();
  console.log('Seeded demo accounts and sample data.');
  return true;
}

async function seedNow() {
  const hash = await auth.hashPassword(DEMO_PASSWORD);
  await db.tx(async (client) => {
    const ids = {};
    for (const u of demoUsers) {
      const r = await client.query(
        `INSERT INTO users (email, password_hash, full_name, role, status, email_verified, is_demo)
         VALUES ($1, $2, $3, $4, $5, TRUE, TRUE) RETURNING id`,
        [u.email, hash, u.name, u.role, u.status]
      );
      ids[u.email] = r.rows[0].id;
    }

    const resident = ids['resident@example.com'];
    const admin = ids['admin@admin.metn.gov.lb'];
    const t = config.town;

    const reports = [
      ['fire', 'Smoke seen near the main road.', 'received', t.lat + 0.001, t.lng + 0.001, false, false],
      ['fire', 'Fire on the same street, spreading.', 'received', t.lat + 0.0011, t.lng + 0.0012, true, false],
      ['flood', 'Water rising by the lower bridge.', 'in_progress', t.lat - 0.002, t.lng + 0.003, false, false],
      ['electricity', 'Power line down after the storm.', 'sent', t.lat + 0.003, t.lng - 0.001, false, false],
      ['medical', 'Elderly neighbor needs help.', 'sent', t.lat - 0.001, t.lng - 0.002, true, false]
    ];
    for (const r of reports) {
      await client.query(
        `INSERT INTO reports (reporter_id, type, description, status, lat, lng, need_help, is_safe, is_demo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)`,
        [resident, r[0], r[1], r[2], r[3], r[4], r[5], r[6]]
      );
    }

    const broadcasts = [
      ['Road closed near the church', 'The main road is closed for repair until evening.', 'standard', null, null, null],
      ['Storm warning tonight', 'Strong winds expected after 9 pm. Stay indoors if you can.', 'time_sensitive', t.lat, t.lng, 3]
    ];
    for (const b of broadcasts) {
      await client.query(
        `INSERT INTO broadcasts (admin_id, title, message, severity, lat, lng, radius_km, is_demo)
         VALUES ($1, $2, $3, $4, $5, $6, $7, TRUE)`,
        [admin, b[0], b[1], b[2], b[3], b[4], b[5]]
      );
    }
  });
}

// Removes only demo rows, then reseeds them. Real data is untouched.
async function resetDemo() {
  await db.tx(async (client) => {
    await client.query('DELETE FROM reports WHERE is_demo = TRUE');
    await client.query('DELETE FROM broadcasts WHERE is_demo = TRUE');
    await client.query('DELETE FROM users WHERE is_demo = TRUE');
  });
  await seedNow();
}

module.exports = { seedIfEmpty, resetDemo, DEMO_PASSWORD };
