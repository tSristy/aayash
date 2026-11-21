'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => sequelize.define('ProductOptionValue', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    option_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    value: { type: DataTypes.STRING(100), allowNull: false },
    sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, { tableName: 'product_option_values', timestamps: false });
