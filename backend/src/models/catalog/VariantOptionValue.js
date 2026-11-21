'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => sequelize.define('VariantOptionValue', {
    variant_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
    option_value_id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true },
}, { tableName: 'variant_option_values', timestamps: false });
