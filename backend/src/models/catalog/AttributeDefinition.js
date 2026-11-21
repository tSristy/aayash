'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => sequelize.define('AttributeDefinition', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    code: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(120), allowNull: false },
    data_type: { type: DataTypes.ENUM('text', 'textarea', 'number', 'boolean', 'date', 'select', 'multiselect'), allowNull: false },
    unit: { type: DataTypes.STRING(32), allowNull: true },
    allowed_values_json: { type: DataTypes.JSON, allowNull: true },
    validation_json: { type: DataTypes.JSON, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
}, { tableName: 'attribute_definitions', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
