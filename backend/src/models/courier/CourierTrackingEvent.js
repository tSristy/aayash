'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('CourierTrackingEvent', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  shipment_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
  provider_status: { type: DataTypes.STRING(100) },
  mapped_status: { type: DataTypes.STRING(32), allowNull: false },
  source: { type: DataTypes.ENUM('manual', 'api', 'webhook'), defaultValue: 'manual' },
  event_time: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  note: { type: DataTypes.STRING(500) },
  created_by_admin_id: { type: DataTypes.INTEGER.UNSIGNED },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'courier_tracking_events',
  timestamps: false,
});
