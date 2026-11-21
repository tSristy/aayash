'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => sequelize.define('ProductType', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    code: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(120), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
}, { tableName: 'product_types', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
