'use strict';
const { DataTypes } = require('sequelize');
module.exports = sequelize => sequelize.define('ProductImage', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    product_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    variant_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: true },
    url: { type: DataTypes.STRING(500), allowNull: false },
    alt: { type: DataTypes.STRING(200), allowNull: true },
    sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, { tableName: 'product_images', timestamps: false });
