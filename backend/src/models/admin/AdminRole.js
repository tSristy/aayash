'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => sequelize.define('AdminRole', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    code: { type: DataTypes.STRING(40), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
}, { tableName: 'admin_roles', timestamps: false });
