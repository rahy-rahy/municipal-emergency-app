'use strict';
const { runMigrations } = require('../server/db/migrate');
runMigrations()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err.message); process.exit(1); });
