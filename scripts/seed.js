'use strict';
const { seedIfEmpty } = require('../server/seed');
seedIfEmpty()
  .then(() => process.exit(0))
  .catch((err) => { console.error(err.message); process.exit(1); });
