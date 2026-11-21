'use strict';

const { DB } = require('../config');
const { sequelize } = require('../src/db/sequelize');
const {
  BUSINESS_TABLES,
  PRESERVED_TABLES,
  assertSafeReset,
  assertKnownSchema,
  assertSafeForeignKeys,
} = require('./business-data-plan');

/**
 * Intentionally destructive, development-only operation.
 * Must be run manually and NEVER during npm run dev or deployment.
 */
async function clearBusinessData() {
  assertSafeReset({
    nodeEnv: process.env.NODE_ENV,
    databaseName: DB.database,
    databaseHost: DB.host,
    confirmation: process.argv[2],
  });

  await sequelize.authenticate();

  const [databaseRows] = await sequelize.query('SELECT DATABASE() AS database_name');
  const connectedDatabase = databaseRows[0]?.database_name;

  if (connectedDatabase !== DB.database) {
    throw new Error('Blocked: connected database does not match configured database.');
  }

  const [tableRows] = await sequelize.query(`
    SELECT TABLE_NAME AS table_name
    FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_TYPE = 'BASE TABLE'
  `);

  assertKnownSchema(tableRows.map((row) => row.table_name));

  const [foreignKeyRows] = await sequelize.query(`
    SELECT
      TABLE_NAME AS child_table,
      REFERENCED_TABLE_NAME AS parent_table
    FROM information_schema.KEY_COLUMN_USAGE
    WHERE TABLE_SCHEMA = DATABASE()
      AND REFERENCED_TABLE_SCHEMA = DATABASE()
      AND REFERENCED_TABLE_NAME IS NOT NULL
  `);

  assertSafeForeignKeys(
    foreignKeyRows.map((row) => ({
      childTable: row.child_table,
      parentTable: row.parent_table,
    }))
  );

  const beforeAdmin = {};

  for (const table of PRESERVED_TABLES) {
    const [rows] = await sequelize.query(`SELECT COUNT(*) AS total FROM \`${table}\``);
    beforeAdmin[table] = Number(rows[0].total);
  }

  if (beforeAdmin.admin_users === 0 || beforeAdmin.admin_roles === 0) {
    throw new Error('Blocked: a valid Admin user and role must exist before reset.');
  }

  console.log(`Connected to development database: ${connectedDatabase}`);
  console.log(`Clearing ${BUSINESS_TABLES.length} business tables.`);
  console.log('Preserving Admin accounts, sessions, roles and schema migrations.');

  await sequelize.transaction(async (transaction) => {
    for (const table of BUSINESS_TABLES) {
      // Table names come only from the static, allowlisted BUSINESS_TABLES array.
      await sequelize.query(`DELETE FROM \`${table}\``, { transaction });
      console.log(`Cleared: ${table}`);
    }
  });

  for (const table of BUSINESS_TABLES) {
    const [rows] = await sequelize.query(`SELECT COUNT(*) AS total FROM \`${table}\``);

    if (Number(rows[0].total) !== 0) {
      throw new Error(`Post-reset verification failed: ${table} is not empty.`);
    }
  }

  for (const table of PRESERVED_TABLES) {
    const [rows] = await sequelize.query(`SELECT COUNT(*) AS total FROM \`${table}\``);

    if (Number(rows[0].total) !== beforeAdmin[table]) {
      throw new Error(`Post-reset verification failed: ${table} count changed.`);
    }
  }

  console.log('SUCCESS: all business records removed; Admin and migration records preserved.');
  console.log('Note: DELETE does not reset AUTO_INCREMENT counters or remove uploaded files.');
}

if (require.main === module) {
  clearBusinessData()
    .catch((error) => {
      console.error('Business data reset failed:', error.message);
      process.exitCode = 1;
    })
    .finally(async () => {
      await sequelize.close();
    });
}

module.exports = { clearBusinessData };
