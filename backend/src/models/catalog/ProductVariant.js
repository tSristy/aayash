'use strict';
const { DataTypes } = require('sequelize');
module.exports = sequelize => sequelize.define('CatalogProductVariant', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    product_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    sku: { type: DataTypes.STRING(60), allowNull: false, unique: true },
    label: { type: DataTypes.STRING(60), allowNull: false },
    price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
    compare_at_price: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
    stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    is_default: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
}, { tableName: 'product_variants', timestamps: false });
