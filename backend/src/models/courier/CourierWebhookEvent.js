'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('CourierWebhookEvent', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  provider_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  event_key: { type: DataTypes.CHAR(64), allowNull: false },
  event_type: { type: DataTypes.STRING(80) },
  status: { type: DataTypes.STRING(24), defaultValue: 'received' },
  processed_at: { type: DataTypes.DATE },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'courier_webhook_events',
  timestamps: false,
});
