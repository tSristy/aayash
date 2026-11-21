'use strict';
const { DataTypes } = require('sequelize');
module.exports = (sequelize) => sequelize.define('AdminSession', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false },
    token_hash: { type: DataTypes.CHAR(64), allowNull: false, unique: true },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    last_seen_at: { type: DataTypes.DATE, allowNull: false },
    revoked_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false },
}, { tableName: 'admin_sessions', timestamps: false });
