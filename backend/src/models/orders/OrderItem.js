'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('CommerceOrderItem', {
  id: {
    type: DataTypes.INTEGER.UNSIGNED,
    primaryKey: true,
    autoIncrement: true,
  },
  order_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  product_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  variant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  variant_label: { type: DataTypes.STRING(60), allowNull: false },
  unit_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  qty: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
  line_total: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
}, {
  tableName: 'order_items',
  timestamps: false,
});
