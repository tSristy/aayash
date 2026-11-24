'use strict';

/**
 * Courier foundation only. No external shipment is booked by this migration.
 * Existing orders, catalog data and admin sessions remain untouched.
 */
async function up(queryInterface) {
  const { DataTypes } = require('sequelize');

  const existing = new Set(
    (await queryInterface.showAllTables()).map((table) => (
      typeof table === 'string' ? table : table.tableName
    ))
  );

  async function ensureTable(name, definition) {
    if (!existing.has(name)) {
      await queryInterface.createTable(name, definition, {
        engine: 'InnoDB',
        charset: 'utf8mb4',
      });
      existing.add(name);
    }
  }

  const id = () => ({
    type: DataTypes.BIGINT.UNSIGNED,
    autoIncrement: true,
    primaryKey: true,
  });

  const createdAt = () => ({
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  });

  const orderId = () => ({
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    references: { model: 'orders', key: 'id' },
    onDelete: 'RESTRICT',
  });

  const providerId = () => ({
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    references: { model: 'courier_providers', key: 'id' },
    onDelete: 'RESTRICT',
  });

  await ensureTable('courier_providers', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    code: { type: DataTypes.STRING(40), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(120), allowNull: false },
    integration_mode: { type: DataTypes.ENUM('manual', 'api'), allowNull: false, defaultValue: 'manual' },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: createdAt(),
    updated_at: createdAt(),
  });

  await ensureTable('courier_shipments', {
    id: id(),
    order_id: orderId(),
    provider_id: providerId(),
    consignment_id: { type: DataTypes.STRING(120), allowNull: false },
    tracking_url: { type: DataTypes.STRING(500), allowNull: true },
    status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'booked' },
    booking_mode: { type: DataTypes.ENUM('manual', 'api'), allowNull: false, defaultValue: 'manual' },
    cod_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
    weight_kg: { type: DataTypes.DECIMAL(8, 3), allowNull: true },
    note: { type: DataTypes.STRING(500), allowNull: true },
    created_by_admin_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: 'admin_users', key: 'id' },
      onDelete: 'SET NULL',
    },
    booked_at: createdAt(),
    created_at: createdAt(),
    updated_at: createdAt(),
  });

  await ensureTable('courier_tracking_events', {
    id: id(),
    shipment_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      references: { model: 'courier_shipments', key: 'id' },
      onDelete: 'CASCADE',
    },
    provider_status: { type: DataTypes.STRING(100), allowNull: true },
    mapped_status: { type: DataTypes.STRING(32), allowNull: false },
    source: { type: DataTypes.ENUM('manual', 'api', 'webhook'), allowNull: false, defaultValue: 'manual' },
    event_time: createdAt(),
    note: { type: DataTypes.STRING(500), allowNull: true },
    created_by_admin_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: 'admin_users', key: 'id' },
      onDelete: 'SET NULL',
    },
    created_at: createdAt(),
  });

  await ensureTable('courier_api_requests', {
    id: id(),
    shipment_id: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: true,
      references: { model: 'courier_shipments', key: 'id' },
      onDelete: 'SET NULL',
    },
    provider_id: providerId(),
    request_key: { type: DataTypes.STRING(100), allowNull: false, unique: true },
    operation: { type: DataTypes.STRING(40), allowNull: false },
    status: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'pending' },
    attempt_count: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    last_error: { type: DataTypes.STRING(500), allowNull: true },
    created_at: createdAt(),
    updated_at: createdAt(),
  });

  await ensureTable('customer_risk_checks', {
    id: id(),
    order_id: orderId(),
    phone_hash: { type: DataTypes.CHAR(64), allowNull: false },
    source: { type: DataTypes.STRING(40), allowNull: false },
    result_json: { type: DataTypes.JSON, allowNull: true },
    checked_by_admin_id: {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: 'admin_users', key: 'id' },
      onDelete: 'SET NULL',
    },
    checked_at: createdAt(),
  });

  await ensureTable('courier_webhook_events', {
    id: id(),
    provider_id: providerId(),
    event_key: { type: DataTypes.CHAR(64), allowNull: false },
    event_type: { type: DataTypes.STRING(80), allowNull: true },
    status: { type: DataTypes.STRING(24), allowNull: false, defaultValue: 'received' },
    processed_at: { type: DataTypes.DATE, allowNull: true },
    created_at: createdAt(),
  });

  const indexes = [
    ['courier_shipments', 'idx_courier_shipments_order', ['order_id'], false],
    ['orders', 'idx_orders_status_created', ['status', 'created_at'], false],
    ['orders', 'idx_orders_created_id', ['created_at', 'id'], false],
    ['courier_shipments', 'uq_courier_consignment', ['provider_id', 'consignment_id'], true],
    ['courier_tracking_events', 'idx_courier_events_shipment', ['shipment_id', 'id'], false],
    ['customer_risk_checks', 'idx_courier_risk_order', ['order_id', 'checked_at'], false],
    ['courier_webhook_events', 'uq_courier_webhook', ['provider_id', 'event_key'], true],
  ];

  for (const [table, name, fields, unique] of indexes) {
    const current = await queryInterface.showIndex(table);
    if (!current.some((index) => index.name === name)) {
      await queryInterface.addIndex(table, fields, { name, unique });
    }
  }

  // These are supported courier master definitions, not demo business data.
  await queryInterface.sequelize.query(`
    INSERT IGNORE INTO courier_providers (code, name, integration_mode, is_active)
    VALUES
      ('steadfast', 'Steadfast Courier', 'manual', 1),
      ('pathao', 'Pathao Courier', 'manual', 1),
      ('redx', 'REDX', 'manual', 1)
  `);
}

module.exports = { up };
