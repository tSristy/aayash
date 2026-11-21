'use strict';

const { runMigrations } = require('../src/db/migration-runner');
const { sequelize } = require('../src/db/sequelize');

async function main() {
  try {
    await runMigrations();
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
