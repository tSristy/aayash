'use strict';
const { Sequelize } = require('sequelize');
const { DB } = require('../../config');

// The existing MariaDB server speaks the MySQL protocol, so mysql2 can serve
// as the dialect driver. Existing public SQL remains intact during migration.
const sequelize = new Sequelize(DB.database, DB.user, DB.password, {
  host: DB.host,
  port: DB.port,
  dialect: 'mysql',
  timezone: '+00:00',
  logging: process.env.DB_LOG_SQL === 'true' ? (sql) => console.log(sql) : false,
  pool: { max: 10, min: 0, idle: 10000, acquire: 30000 },
  define: { freezeTableName: true },
});
module.exports = { sequelize };
