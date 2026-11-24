'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('CourierShipment', {
  id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
  order_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  provider_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  consignment_id: { type: DataTypes.STRING(120), allowNull: false },
  tracking_url: { type: DataTypes.STRING(500) },
  status: { type: DataTypes.STRING(32), allowNull: false, defaultValue: 'booked' },
  booking_mode: { type: DataTypes.ENUM('manual', 'api'), defaultValue: 'manual' },
  cod_amount: { type: DataTypes.DECIMAL(12, 2), allowNull: false },
  weight_kg: { type: DataTypes.DECIMAL(8, 3) },
  note: { type: DataTypes.STRING(500) },
  created_by_admin_id: { type: DataTypes.INTEGER.UNSIGNED },
  booked_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'courier_shipments',
  timestamps: false,
});
