'use strict';
const { DataTypes, literal } = require('sequelize');
// createTable may commit automatically in MariaDB. All operations are additive,
// and re-running is safe after an interrupted migration.
module.exports.up = async (qi) => {
  const tables = (await qi.showAllTables()).map((x) => typeof x === 'string' ? x : (x.tableName || Object.values(x)[0]));
  const has = (table) => tables.some((x) => x.toLowerCase() === table.toLowerCase());
  if (!has('admin_roles')) await qi.createTable('admin_roles', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    code: { type: DataTypes.STRING(40), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
  }, { engine: 'InnoDB', charset: 'utf8mb4' });

  if (!has('admin_users')) await qi.createTable('admin_users', {
    id: { type: DataTypes.INTEGER.UNSIGNED, autoIncrement: true, primaryKey: true },
    role_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, references: { model: 'admin_roles', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'RESTRICT' },
    username: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(120), allowNull: false },
    email: { type: DataTypes.STRING(190), allowNull: true, unique: true },
    password_hash: { type: DataTypes.STRING(255), allowNull: false },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    failed_attempts: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    locked_until: { type: DataTypes.DATE, allowNull: true },
    last_login_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
    updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
  }, { engine: 'InnoDB', charset: 'utf8mb4' });

  if (!has('admin_sessions')) await qi.createTable('admin_sessions', {
    id: { type: DataTypes.BIGINT.UNSIGNED, autoIncrement: true, primaryKey: true },
    user_id: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, references: { model: 'admin_users', key: 'id' }, onUpdate: 'CASCADE', onDelete: 'CASCADE' },
    token_hash: { type: DataTypes.CHAR(64), allowNull: false, unique: true },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    last_seen_at: { type: DataTypes.DATE, allowNull: false },
    revoked_at: { type: DataTypes.DATE, allowNull: true },
    created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') },
  }, { engine: 'InnoDB', charset: 'utf8mb4' });
};
