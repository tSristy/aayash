'use strict';

const { sequelize } = require('../src/db/sequelize');
const { REQUIRED_TABLES } = require('../src/db/migration-runner');

async function main() {
  try {
    await sequelize.authenticate();
    const queryInterface = sequelize.getQueryInterface();
    const existing = (await queryInterface.showAllTables()).map(entry => {
      return typeof entry === 'string'
        ? entry
        : entry.tableName || Object.values(entry)[0];
    });

    const normalized = new Set(existing.map(name => name.toLowerCase()));
    const missing = REQUIRED_TABLES.filter(name => !normalized.has(name));

    console.log(`Database: ${sequelize.config.database}`);
    console.log(`Tables: ${existing.length}`);
    console.log(`Expected core tables: ${REQUIRED_TABLES.length}`);

    if (missing.length) {
      console.error(`Missing tables: ${missing.join(', ')}`);
      process.exitCode = 1;
    } else {
      console.log('All expected core tables exist.');
    }

    if (normalized.has('schema_migrations')) {
      const [history] = await sequelize.query(
        'SELECT name FROM schema_migrations ORDER BY name'
      );

      console.log(`Applied migrations: ${history.length}`);
      for (const item of history) {
        console.log(`  - ${item.name}`);
      }
    }
  } catch (error) {
    console.error('Database status check failed:', error.message);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
}

main();
