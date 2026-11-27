'use strict';

const { pool } = require('../../db');
const { findSession } = require('./session');
const { ALL_PERMISSIONS } = require('./permissions');

async function permissionsFor(user) {
  if (user.role?.code === 'super_admin') return ALL_PERMISSIONS;
  const [rows] = await pool.query('SELECT permission FROM role_permissions WHERE role_id = ?', [user.role_id]);
  return rows.map((row) => row.permission);
}

// Allow the request when the admin holds ANY of the listed permissions.
function requirePermission(...codes) {
  return async (req, res, next) => {
    try {
      const session = await findSession(req);
      if (!session) return res.status(401).json({ error: 'Authentication required.' });
      const permissions = await permissionsFor(session.user);
      if (codes.length && !codes.some((code) => permissions.includes(code))) {
        return res.status(403).json({ error: 'You do not have permission to do this.' });
      }
      req.adminUser = session.user;
      req.permissions = permissions;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}

// Read-only methods need `view`, everything else needs `manage`.
function requireByMethod(view, manage) {
  return (req, res, next) => {
    const read = req.method === 'GET' || req.method === 'HEAD';
    return requirePermission(...(read ? [view, manage] : [manage]))(req, res, next);
  };
}

module.exports = { permissionsFor, requirePermission, requireByMethod };
