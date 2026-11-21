'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => sequelize.define('AdminUser', {
    id: { type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true },
    role_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    username: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(120), allowNull: false },
    email: { type: DataTypes.STRING(190), allowNull: true, unique: true },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    failed_attempts: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    locked_until: { type: DataTypes.DATE, allowNull: true },
    last_login_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
    updated_at: { type: DataTypes.DATE, allowNull: false },
}, { tableName: 'admin_users', timestamps: true, createdAt: 'created_at', updatedAt: 'updated_at' });
