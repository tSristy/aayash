'use strict';

/**
 * The ordering is intentional: dependent (child) tables are cleared before
 * their referenced (parent) tables, with foreign key checks kept enabled.
 *
 * Admin authentication and migration history are NEVER part of this list.
 */
const BUSINESS_TABLES = Object.freeze([
  'courier_tracking_events',
  'courier_api_requests',
  'courier_webhook_events',
  'customer_risk_checks',
  'courier_shipments',
  'order_status_history',
  'order_items',
  'wishlists',
  'reviews',
  'orders',
  'addresses',
  'product_attribute_values',
  'variant_option_values',
  'product_images',
  'product_option_values',
  'product_options',
  'product_variants',
  'products',
  'product_type_attributes',
  'attribute_definitions',
  'product_types',
  'categories',
  'brands',
  'coupons',
  'customers',
  'newsletter_subscribers',
]);

const PRESERVED_TABLES = Object.freeze([
  'admin_roles',
  'admin_users',
  'admin_sessions',
  'schema_migrations',
  // Stable provider master definitions are needed after a development reset.
  'courier_providers',
]);

const RESET_CONFIRMATION = 'DELETE_AYASHMART_DEV_DATA';
const EXPECTED_DATABASE_NAME = 'aayash_emart';
const LOCAL_DB_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

function assertSafeReset({ nodeEnv, databaseName, databaseHost, confirmation }) {
  if (nodeEnv !== 'development') {
    throw new Error('Blocked: business data reset is allowed only in development.');
  }

  if (databaseName !== EXPECTED_DATABASE_NAME) {
    throw new Error(`Blocked: expected database ${EXPECTED_DATABASE_NAME}.`);
  }

  if (!LOCAL_DB_HOSTS.has(databaseHost)) {
    throw new Error('Blocked: database host must be local for this reset command.');
  }

  if (confirmation !== RESET_CONFIRMATION) {
    throw new Error(
      `Blocked: run npm run data:clear -- ${RESET_CONFIRMATION} to confirm.`
    );
  }
}

function assertKnownSchema(existingTables) {
  const actual = new Set(existingTables.map((name) => name.toLowerCase()));
  const required = [...BUSINESS_TABLES, ...PRESERVED_TABLES];
  const missing = required.filter((name) => !actual.has(name));

  if (missing.length > 0) {
    throw new Error(`Blocked: missing expected tables: ${missing.join(', ')}.`);
  }
}

/**
 * Block if another table references business data but is not being cleared.
 * Also make sure every known non-self-referential FK is deleted child-first.
 */
function assertSafeForeignKeys(foreignKeys) {
  const business = new Set(BUSINESS_TABLES);

  for (const { childTable, parentTable } of foreignKeys) {
    if (!business.has(parentTable)) {
      continue;
    }

    if (!business.has(childTable)) {
      throw new Error(
        `Blocked: ${childTable} references ${parentTable} but is not in the reset plan.`
      );
    }

    if (childTable === parentTable) {
      continue;
    }

    const childPosition = BUSINESS_TABLES.indexOf(childTable);
    const parentPosition = BUSINESS_TABLES.indexOf(parentTable);

    if (childPosition > parentPosition) {
      throw new Error(
        `Blocked: invalid foreign key reset order (${childTable} -> ${parentTable}).`
      );
    }
  }
}

module.exports = {
  BUSINESS_TABLES,
  PRESERVED_TABLES,
  RESET_CONFIRMATION,
  assertSafeReset,
  assertKnownSchema,
  assertSafeForeignKeys,
};
