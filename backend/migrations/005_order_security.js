'use strict';

/**
 * New checkouts receive a secret tracking code (only its hash is persisted).
 * Previously placed orders remain intact and have NULL tracking_token_hash.
 * Status history is append-only and does not change existing order statuses.
 */
async function up(queryInterface) {
  const { DataTypes } = require('sequelize');
  const orders = await queryInterface.describeTable('orders');

  if (!orders.tracking_token_hash) {
    await queryInterface.addColumn('orders', 'tracking_token_hash', {
      type: DataTypes.CHAR(64),
      allowNull: true,
    });
  }

  if (!orders.stock_accounting_version) {
    await queryInterface.addColumn('orders', 'stock_accounting_version', {
      type: DataTypes.TINYINT.UNSIGNED,
      allowNull: false,
      defaultValue: 1,
    });
  }

  const indexes = await queryInterface.showIndex('orders');

  if (!indexes.some((index) => index.name === 'uq_orders_tracking_token')) {
    await queryInterface.addIndex('orders', ['tracking_token_hash'], {
      name: 'uq_orders_tracking_token',
      unique: true,
    });
  }

  const tables = (await queryInterface.showAllTables()).map((table) => (
    typeof table === 'string' ? table : table.tableName
  ));

  if (!tables.includes('order_status_history')) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS order_status_history (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        order_id INT UNSIGNED NOT NULL,
        old_status VARCHAR(32) NULL,
        new_status VARCHAR(32) NOT NULL,
        changed_by_admin_id INT UNSIGNED NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_order_status_history_order (order_id, id),
        CONSTRAINT fk_order_status_history_order
          FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
        CONSTRAINT fk_order_status_history_admin
          FOREIGN KEY (changed_by_admin_id) REFERENCES admin_users(id)
          ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  }
}

module.exports = { up };
