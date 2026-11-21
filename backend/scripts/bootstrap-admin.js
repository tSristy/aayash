'use strict';

// Explicit command for the first production deployment or local recovery.
// Credentials come from your private environment / deployment secret store.
const { sequelize } = require('../src/models');
const { seedInitialAdmin } = require('../src/bootstrap/admin');

(async () => {
  try {
    await sequelize.authenticate();
    const result = await seedInitialAdmin();
    if (result.created) console.log(`[admin-bootstrap] Created initial admin: ${result.username}`);
    else console.log('[admin-bootstrap] Existing administrator found; skipped without modifying credentials.');
  } catch (error) {
    console.error('[admin-bootstrap] Failed:', error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
})();
