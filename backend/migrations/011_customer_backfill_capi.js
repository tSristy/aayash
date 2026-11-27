'use strict';

/**
 * Link historical guest orders to customer records, and keep the payload of
 * server-side Meta events so failed sends can be retried.
 */
async function up(queryInterface) {
  const sequelize = queryInterface.sequelize;
  const run = (sql, replacements) => sequelize.query(sql, { replacements });

  const columns = await queryInterface.describeTable('capi_events');
  if (!columns.payload) await run('ALTER TABLE capi_events ADD COLUMN payload MEDIUMTEXT NULL');
  if (!columns.updated_at) await run('ALTER TABLE capi_events ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP');

  // One customer per distinct phone, named after the most recent order.
  await run(`INSERT IGNORE INTO customers (name, phone, address, city)
    SELECT o.guest_name, o.guest_phone, o.address_line, o.city
    FROM orders o JOIN (SELECT guest_phone, MAX(id) AS id FROM orders WHERE customer_id IS NULL GROUP BY guest_phone) last_order ON last_order.id = o.id
    WHERE o.guest_phone NOT IN (SELECT phone FROM customers)`);
  await run('UPDATE orders o JOIN customers c ON c.phone = o.guest_phone SET o.customer_id = c.id WHERE o.customer_id IS NULL');
}

module.exports = { up };
