'use strict';

const { sequelize, AdminRole, AdminUser } = require('../models');
const { hashPassword, MIN_PASSWORD_LENGTH } = require('../auth/password');
const { bootstrapInitialAdmin, shouldAutoBootstrap } = require('./admin-core');

async function seedInitialAdmin(env = process.env) {
  return bootstrapInitialAdmin({
    sequelize,
    AdminRole,
    AdminUser,
    hashPassword,
    minimumLength: MIN_PASSWORD_LENGTH,
    username: env.ADMIN_USERNAME,
    password: env.ADMIN_PASSWORD,
  });
}

async function bootstrapOnDevelopmentStart(env = process.env) {
  if (!shouldAutoBootstrap(env)) return { created: false, reason: 'automatic_bootstrap_disabled' };
  const result = await seedInitialAdmin(env);
  if (result.created) console.log(`[admin-bootstrap] Created initial admin: ${result.username}`);
  else console.log('[admin-bootstrap] Existing admin found, no changes made.');
  return result;
}

module.exports = { seedInitialAdmin, bootstrapOnDevelopmentStart };
