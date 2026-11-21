'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => sequelize.define('Brand', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(120), allowNull: false, unique: true },
    slug: { type: DataTypes.STRING(140), allowNull: false, unique: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
}, { tableName: 'brands', timestamps: false });
