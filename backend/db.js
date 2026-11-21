'use strict';

const fs = require('node:fs');
const path = require('node:path');
const mysql = require('mysql2/promise');
const { DB } = require('./config');

const pool = mysql.createPool({
  ...DB,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true,
});

/**
 * Create the base commerce tables if they are missing.
 * This does not delete data, reseed sample products, or reset any table.
 * Versioned Sequelize migrations manage future schema changes.
 */
async function init() {
  const { database, ...serverConfig } = DB;

  if (!/^[a-zA-Z0-9_]+$/.test(database)) {
    throw new Error('DB_NAME may contain only letters, numbers and underscores.');
  }

  const bootConnection = await mysql.createConnection({
    ...serverConfig,
    multipleStatements: true,
  });

  try {
    // Most production DB users cannot CREATE DATABASE. Only attempt to
    // create it when it does not exist; otherwise use existing privileges.
    const [databases] = await bootConnection.query(
      'SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?',
      [database]
    );

    if (databases.length === 0) {
      await bootConnection.query(
        `CREATE DATABASE \`${database}\` ` +
        'CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci'
      );
    }

    await bootConnection.query(`USE \`${database}\``);

    const schemaPath = path.join(__dirname, 'schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    await bootConnection.query(schemaSql);
  } finally {
    await bootConnection.end();
  }
}

module.exports = { pool, init };
