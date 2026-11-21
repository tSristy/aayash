'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => sequelize.define('ProductTypeAttribute', {
    product_type_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
    attribute_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
    group_name: { type: DataTypes.STRING(100), allowNull: false, defaultValue: 'General' },
    is_required: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    is_filterable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    is_visible: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, { tableName: 'product_type_attributes', timestamps: false });
