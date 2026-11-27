'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const { sequelize } = require('./sequelize');
const { init } = require('../../db');

const MIGRATION_DIRECTORY = path.join(__dirname, '..', '..', 'migrations');

const REQUIRED_TABLES = [
  'admin_roles',
  'admin_users',
  'admin_sessions',
  'schema_migrations',
  'addresses',
  'coupons',
  'customers',
  'newsletter_subscribers',
  'orders',
  'order_items',
  'reviews',
  'wishlists',
  'categories',
  'brands',
  'products',
  'product_variants',
  'product_images',
  'product_types',
  'attribute_definitions',
  'product_type_attributes',
  'product_attribute_values',
  'product_options',
  'product_option_values',
  'variant_option_values',
  'order_status_history',
  'courier_providers',
  'courier_shipments',
  'courier_tracking_events',
  'courier_api_requests',
  'customer_risk_checks',
  'courier_webhook_events',
  'order_notes',
  'note_presets',
  'order_sources',
  'checkout_drafts',
  'delivery_zones',
  'delivery_cities',
  'delivery_areas',
  'product_views_daily',
  'combo_items',
  'stock_movements',
  'damage_records',
  'suppliers',
  'purchases',
  'purchase_items',
  'accounts',
  'account_purposes',
  'transactions',
  'fund_transfers',
  'due_records',
  'employees',
  'salary_payments',
  'bills',
  'customer_sessions',
  'blocklist',
  'contact_messages',
  'role_permissions',
  'activity_log',
  'site_settings',
  'cms_pages',
  'sliders',
  'banners',
  'menu_links',
  'landing_pages',
  'marketing_tags',
  'capi_events',
];

function migrationFiles() {
  return fs.readdirSync(MIGRATION_DIRECTORY)
    .filter(name => /^\d+_[\w-]+\.js$/.test(name))
    .sort();
}

function checksumFor(contents) {
  return crypto.createHash('sha256').update(contents).digest('hex');
}

async function ensureMigrationHistory() {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(120) PRIMARY KEY,
      checksum CHAR(64) NOT NULL,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

async function verifyRequiredTables() {
  const queryInterface = sequelize.getQueryInterface();
  const tables = new Set((await queryInterface.showAllTables()).map(entry => {
    const name = typeof entry === 'string'
      ? entry
      : entry.tableName || Object.values(entry)[0];

    return String(name).toLowerCase();
  }));

  const missing = REQUIRED_TABLES.filter(name => !tables.has(name));
  if (missing.length) {
    throw new Error(
      `Migration history is inconsistent: missing ${missing.join(', ')}. ` +
      'Restore from backup or repair with a reviewed migration; refusing silent data loss.'
    );
  }

  // Migration history must agree with the schema. A missing previously
  // migrated column should never be silently recreated on a live database.
  for (const [table, requiredColumns] of [
    ['brands', ['is_active']],
    ['products', ['product_type_id', 'status']],
    ['product_images', ['variant_id']],
    ['courier_providers', ['is_archived', 'contact_phone', 'website_url', 'tracking_url_template', 'notes']],
  ]) {
    const existingColumns = await queryInterface.describeTable(table);
    const missingColumns = requiredColumns.filter(column => !existingColumns[column]);

    if (missingColumns.length) {
      throw new Error(
        `Schema drift in ${table}: missing ${missingColumns.join(', ')}. ` +
        'Review database history before applying a repair migration.'
      );
    }
  }
}

async function runMigrations({ log = console.log, initializeBase = true } = {}) {
  // The legacy commerce tables live in schema.sql. It contains only
  // CREATE TABLE IF NOT EXISTS statements, and never seeds business records.
  if (initializeBase) {
    await init();
  }

  await sequelize.authenticate();
  await ensureMigrationHistory();

  for (const name of migrationFiles()) {
    const absolutePath = path.join(MIGRATION_DIRECTORY, name);
    const contents = fs.readFileSync(absolutePath);
    const checksum = checksumFor(contents);
    const [existing] = await sequelize.query(
      'SELECT checksum FROM schema_migrations WHERE name = ?',
      { replacements: [name] }
    );

    if (existing.length) {
      if (existing[0].checksum !== checksum) {
        throw new Error(`Applied migration was modified: ${name}`);
      }

      log(`Already applied: ${name}`);
      continue;
    }

    log(`Applying: ${name}`);

    // MariaDB DDL may auto-commit. Migrations 001-004 are written to be
    // retryable after partial execution (IF NOT EXISTS / column guards).
    await require(absolutePath).up(sequelize.getQueryInterface());

    await sequelize.query(
      'INSERT INTO schema_migrations (name, checksum) VALUES (?, ?)',
      { replacements: [name, checksum] }
    );

    log(`Applied: ${name}`);
  }

  await verifyRequiredTables();
  log('Migrations complete.');
}

function shouldMigrateOnStart(env = process.env) {
  // Production schema changes belong to an explicit deployment step.
  if (env.NODE_ENV === 'production') {
    return false;
  }

  return env.DB_AUTO_MIGRATE !== 'false';
}

module.exports = {
  runMigrations,
  shouldMigrateOnStart,
  migrationFiles,
  checksumFor,
  REQUIRED_TABLES,
};
