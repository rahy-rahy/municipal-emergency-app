'use strict';

// Applies any SQL files in ./migrations that have not run yet.
// Each file runs once, inside a transaction, in file name order.
const fs = require('fs');
const path = require('path');
const { pool } = require('./pool');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename   TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
}

async function appliedSet(client) {
  const res = await client.query('SELECT filename FROM schema_migrations');
  return new Set(res.rows.map((r) => r.filename));
}

async function runMigrations() {
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const client = await pool.connect();
  try {
    await ensureMigrationsTable(client);
    const done = await appliedSet(client);

    let ran = 0;
    for (const file of files) {
      if (done.has(file)) continue;
      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1)',
          [file]
        );
        await client.query('COMMIT');
        console.log('Applied migration ' + file);
        ran += 1;
      } catch (err) {
        await client.query('ROLLBACK');
        throw new Error('Migration failed at ' + file + ': ' + err.message);
      }
    }
    if (ran === 0) console.log('Database is up to date. No new migrations.');
    return ran;
  } finally {
    client.release();
  }
}

module.exports = { runMigrations };
