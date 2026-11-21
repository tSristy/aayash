'use strict';

const USERNAME_RE = /^[a-z0-9._-]{3,80}$/;

function validateBootstrapCredentials(username, password, minimumLength = 5) {
  const normalized = typeof username === 'string' ? username.trim().toLowerCase() : '';
  if (!USERNAME_RE.test(normalized)) {
    throw new Error('ADMIN_USERNAME must be 3-80 letters, digits, dots, dashes, or underscores.');
  }
  if (typeof password !== 'string' || password.length < minimumLength || password.length > 128 || password === 'aayash123') {
    throw new Error(`ADMIN_PASSWORD must be a unique password of ${minimumLength}-128 characters (not the former demo password).`);
  }
  return normalized;
}

/**
 * Creates an initial administrator only when admin_users is EMPTY.
 * Does not reset, update, enable, or change the password of existing users.
 * Models and hashPassword are injected so the bootstrap can be unit tested without a database.
 */
async function bootstrapInitialAdmin({ sequelize, AdminRole, AdminUser, hashPassword, username, password, minimumLength = 5 }) {
  if (await AdminUser.count() > 0) return { created: false, reason: 'already_initialized' };

  const normalized = validateBootstrapCredentials(username, password, minimumLength);
  const passwordHash = await hashPassword(password);

  try {
    return await sequelize.transaction(async (transaction) => {
      // Second check prevents sequential restarts from duplicating an account.
      if (await AdminUser.count({ transaction }) > 0) {
        return { created: false, reason: 'already_initialized' };
      }
      const [role] = await AdminRole.findOrCreate({
        where: { code: 'super_admin' },
        defaults: { name: 'Super Admin' },
        transaction,
      });
      await AdminUser.create({
        role_id: role.id,
        username: normalized,
        name: 'Admin',
        password_hash: passwordHash,
        is_active: true,
        failed_attempts: 0,
      }, { transaction });
      return { created: true, username: normalized };
    });
  } catch (error) {
    // On simultaneous deployments, a competing bootstrap might win the unique
    // username index. Never attempt to reset that newly created account.
    if ((error.name === 'SequelizeUniqueConstraintError' || error.name === 'SequelizeForeignKeyConstraintError') &&
        await AdminUser.count() > 0) {
      return { created: false, reason: 'already_initialized' };
    }
    throw error;
  }
}

function shouldAutoBootstrap(env = process.env) {
  return env.NODE_ENV !== 'production' && env.ADMIN_ENABLED === 'true';
}

module.exports = { bootstrapInitialAdmin, shouldAutoBootstrap, validateBootstrapCredentials };
