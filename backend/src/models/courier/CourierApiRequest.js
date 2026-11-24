'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('CourierApiRequest', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  shipment_id: { type: DataTypes.BIGINT.UNSIGNED },
  provider_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  request_key: { type: DataTypes.STRING(100), unique: true },
  operation: { type: DataTypes.STRING(40), allowNull: false },
  status: { type: DataTypes.STRING(24), defaultValue: 'pending' },
  attempt_count: { type: DataTypes.INTEGER.UNSIGNED, defaultValue: 0 },
  last_error: { type: DataTypes.STRING(500) },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'courier_api_requests',
  timestamps: false,
});
