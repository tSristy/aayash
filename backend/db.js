const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
const { DB } = require('./config');

const TABLES = [
  'wishlists', 'reviews', 'order_items', 'orders', 'coupons', 'addresses', 'customers',
  'product_images', 'product_variants', 'products', 'brands', 'categories', 'newsletter_subscribers',
];

const pool = mysql.createPool({
  ...DB,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  decimalNumbers: true, // return DECIMAL columns as numbers, not strings
});

// Creates the database and tables if they do not exist yet.
async function init({ reset = false } = {}) {
  const { database, ...server } = DB;
  const boot = await mysql.createConnection({ ...server, multipleStatements: true });
  try {
    await boot.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await boot.query(`USE \`${database}\``);
    if (reset) {
      await boot.query('SET FOREIGN_KEY_CHECKS = 0');
      for (const t of TABLES) await boot.query(`DROP TABLE IF EXISTS \`${t}\``);
      await boot.query('SET FOREIGN_KEY_CHECKS = 1');
    }
    await boot.query(fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8'));
  } finally {
    await boot.end();
  }
}

module.exports = { pool, init };
