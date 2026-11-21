'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => sequelize.define('ProductAttributeValue', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    product_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    attribute_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    value_text: { type: DataTypes.TEXT('long'), allowNull: true },
    value_number: { type: DataTypes.DECIMAL(18, 4), allowNull: true },
    value_boolean: { type: DataTypes.BOOLEAN, allowNull: true },
    value_date: { type: DataTypes.DATEONLY, allowNull: true },
    value_json: { type: DataTypes.JSON, allowNull: true },
    updated_at: { type: DataTypes.DATE, allowNull: false },
}, { tableName: 'product_attribute_values', timestamps: true, createdAt: false, updatedAt: 'updated_at' });
