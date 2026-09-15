'use strict';

// A single shared connection pool. Every query goes through here and
// uses parameters, so user input is never concatenated into SQL.
const { Pool } = require('pg');
const config = require('../config');

let poolConfig;
if (config.databaseUrl) {
  poolConfig = {
    connectionString: config.databaseUrl,
    ssl: config.db.ssl ? { rejectUnauthorized: false } : false
  };
} else {
  poolConfig = {
    host: config.db.host,
    port: config.db.port,
    user: config.db.user,
    password: config.db.password,
    database: config.db.database,
    ssl: config.db.ssl ? { rejectUnauthorized: false } : false
  };
}

poolConfig.max = 10;
poolConfig.idleTimeoutMillis = 30000;
poolConfig.connectionTimeoutMillis = 10000;

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('Unexpected database pool error:', err.message);
});

// query(text, params) returns the pg result.
async function query(text, params) {
  return pool.query(text, params);
}

// one(text, params) returns the first row or null.
async function one(text, params) {
  const res = await pool.query(text, params);
  return res.rows[0] || null;
}

// many(text, params) returns the rows array.
async function many(text, params) {
  const res = await pool.query(text, params);
  return res.rows;
}

// tx(fn) runs fn inside a transaction with its own client.
async function tx(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch (_) {}
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { pool, query, one, many, tx };
