'use strict';

// Creates or promotes an admin account from environment variables.
// Use this once on a real deployment to make your first admin.
//   ADMIN_EMAIL=you@town.gov.lb ADMIN_PASSWORD='a strong password' \
//   ADMIN_NAME='Your Name' node scripts/create-admin.js
const db = require('../server/db/pool');
const auth = require('../server/auth');

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || 'Administrator';
  if (!email || !password) {
    console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }
  const hash = await auth.hashPassword(password);
  const existing = await auth.findByEmail(email);
  if (existing) {
    await db.query(
      "UPDATE users SET role='admin', status='verified', email_verified=TRUE, password_hash=$1, updated_at=now() WHERE id=$2",
      [hash, existing.id]
    );
    console.log('Updated existing account to admin: ' + email);
  } else {
    await db.query(
      "INSERT INTO users (email, password_hash, full_name, role, status, email_verified) VALUES ($1,$2,$3,'admin','verified',TRUE)",
      [email.toLowerCase(), hash, name]
    );
    console.log('Created admin: ' + email);
  }
  process.exit(0);
}

main().catch((e) => { console.error(e.message); process.exit(1); });
