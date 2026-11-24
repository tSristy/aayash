'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('CustomerRiskCheck', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  order_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  phone_hash: { type: DataTypes.CHAR(64), allowNull: false },
  source: { type: DataTypes.STRING(40), allowNull: false },
  result_json: { type: DataTypes.JSON },
  checked_by_admin_id: { type: DataTypes.INTEGER.UNSIGNED },
  checked_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'customer_risk_checks',
  timestamps: false,
});
