'use strict';
const { resetDemo } = require('../server/seed');
resetDemo()
  .then(() => { console.log('Demo data reset.'); process.exit(0); })
  .catch((err) => { console.error(err.message); process.exit(1); });
