'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('CommerceOrder', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  order_no: {
    type: DataTypes.STRING(30),
    allowNull: false,
    unique: true,
  },
  guest_name: { type: DataTypes.STRING(120), allowNull: false },
  guest_phone: { type: DataTypes.STRING(30), allowNull: false },
  address_line: { type: DataTypes.STRING(255), allowNull: false },
  city: { type: DataTypes.STRING(120), allowNull: false },
  payment_method: { type: DataTypes.STRING(20), allowNull: false },
  payment_status: { type: DataTypes.STRING(20), allowNull: false },
  status: {
    type: DataTypes.ENUM(
      'placed', 'pending', 'confirmed', 'wfp', 'packaging', 'packed',
      'out_for_delivery', 'partial_delivered', 'delivered',
      'return_pending', 'returned', 'cancelled'
    ),
    allowNull: false,
  },
  subtotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  delivery_fee: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  discount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  total: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  tracking_token_hash: { type: DataTypes.CHAR(64), allowNull: true },
  stock_accounting_version: { type: DataTypes.TINYINT.UNSIGNED, allowNull: false, defaultValue: 1 },
}, {
  tableName: 'orders',
  timestamps: false,
});
