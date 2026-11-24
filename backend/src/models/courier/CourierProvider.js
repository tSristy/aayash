'use strict';

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => sequelize.define('CourierProvider', {
  id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
  code: { type: DataTypes.STRING(40), allowNull: false, unique: true },
  name: { type: DataTypes.STRING(120), allowNull: false },
  integration_mode: { type: DataTypes.ENUM('manual', 'api'), allowNull: false, defaultValue: 'manual' },
  is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  is_archived: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  contact_phone: { type: DataTypes.STRING(32), allowNull: true },
  website_url: { type: DataTypes.STRING(500), allowNull: true },
  tracking_url_template: { type: DataTypes.STRING(500), allowNull: true },
  notes: { type: DataTypes.STRING(500), allowNull: true },
  created_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updated_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, {
  tableName: 'courier_providers',
  timestamps: false,
});
