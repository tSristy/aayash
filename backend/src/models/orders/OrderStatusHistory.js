'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('OrderStatusHistory', {
  id: {
    type: DataTypes.BIGINT.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  order_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  old_status: { type: DataTypes.STRING(32), allowNull: true },
  new_status: { type: DataTypes.STRING(32), allowNull: false },
  changed_by_admin_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
  created_at: { type: DataTypes.DATE, allowNull: false },
}, {
  tableName: 'order_status_history',
  timestamps: false,
});
