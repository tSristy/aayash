'use strict';

/** Courier tables had NOT NULL timestamps with no default, so raw INSERTs failed. Adds defaults (never edits 006). */
const COLUMNS = {
  courier_api_requests: ['created_at', 'updated_at'],
  courier_providers: ['created_at', 'updated_at'],
  courier_shipments: ['booked_at', 'created_at', 'updated_at'],
  courier_tracking_events: ['created_at', 'event_time'],
  courier_webhook_events: ['created_at'],
};

async function up(queryInterface) {
  const sequelize = queryInterface.sequelize;
  for (const [table, columns] of Object.entries(COLUMNS)) {
    for (const column of columns) {
      const onUpdate = column === 'updated_at' ? ' ON UPDATE CURRENT_TIMESTAMP' : '';
      await sequelize.query(`ALTER TABLE \`${table}\` MODIFY \`${column}\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP${onUpdate}`);
    }
  }
}

async function down() {}

module.exports = { up, down };
