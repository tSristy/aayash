'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => sequelize.define('ProductOption', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    product_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    code: { type: DataTypes.STRING(80), allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, { tableName: 'product_options', timestamps: false });
