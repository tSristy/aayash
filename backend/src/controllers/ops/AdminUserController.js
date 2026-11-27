'use strict';

const { pool } = require('../../../db');
const { HttpError, route, withTx, intParam, text, audit } = require('../../lib/http');
const { hashPassword, MIN_PASSWORD_LENGTH } = require('../../auth/password');
const { PERMISSION_GROUPS, ALL_PERMISSIONS } = require('../../auth/permissions');

const permissionCatalog = route(async (_req, res) => res.json({ groups: PERMISSION_GROUPS.map(([name, items]) => ({ name, items: items.map(([code, label]) => ({ code, label })) })) }));

const listRoles = route(async (_req, res) => {
  const [roles] = await pool.query('SELECT r.id, r.code, r.name, r.description, r.is_system, (SELECT COUNT(*) FROM admin_users u WHERE u.role_id = r.id) AS user_count FROM admin_roles r ORDER BY r.is_system DESC, r.id');
  const [perms] = await pool.query('SELECT role_id, permission FROM role_permissions');
  res.json({ items: roles.map((r) => ({ ...r, user_count: Number(r.user_count), permissions: r.code === 'super_admin' ? ALL_PERMISSIONS : perms.filter((p) => p.role_id === r.id).map((p) => p.permission) })) });
});

function roleInput(body) {
  const name = text(body.name, 'Role name', { max: 100, required: true });
  const permissions = Array.isArray(body.permissions) ? [...new Set(body.permissions)] : [];
  if (permissions.some((p) => !ALL_PERMISSIONS.includes(p))) throw new HttpError(400, 'Unknown permission.');
  return { name, description: text(body.description, 'Description', { max: 255 }), permissions };
}

const createRole = route(async (req, res) => {
  const d = roleInput(req.body || {});
  const code = String(req.body?.code || d.name).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 40);
  if (!code) throw new HttpError(400, 'Role name is required.');
  const id = await withTx(async (conn) => {
    const [r] = await conn.query('INSERT INTO admin_roles (code, name, description) VALUES (?,?,?)', [code, d.name, d.description]);
    for (const p of d.permissions) await conn.query('INSERT INTO role_permissions (role_id, permission) VALUES (?,?)', [r.insertId, p]);
    return r.insertId;
  });
  res.status(201).json({ id });
});

const updateRole = route(async (req, res) => {
  const id = intParam(req.params.id);
  const d = roleInput(req.body || {});
  await withTx(async (conn) => {
    const [[role]] = await conn.query('SELECT code FROM admin_roles WHERE id = ? FOR UPDATE', [id]);
    if (!role) throw new HttpError(404, 'Role not found.');
    if (role.code === 'super_admin') throw new HttpError(409, 'The super admin role always has every permission.');
    await conn.query('UPDATE admin_roles SET name = ?, description = ? WHERE id = ?', [d.name, d.description, id]);
    await conn.query('DELETE FROM role_permissions WHERE role_id = ?', [id]);
    for (const p of d.permissions) await conn.query('INSERT INTO role_permissions (role_id, permission) VALUES (?,?)', [id, p]);
  });
  res.json({ ok: true });
});

const deleteRole = route(async (req, res) => {
  const id = intParam(req.params.id);
  const [[role]] = await pool.query('SELECT code, is_system FROM admin_roles WHERE id = ?', [id]);
  if (!role) throw new HttpError(404, 'Role not found.');
  if (role.is_system) throw new HttpError(409, 'System roles cannot be deleted.');
  const [[used]] = await pool.query('SELECT COUNT(*) AS n FROM admin_users WHERE role_id = ?', [id]);
  if (Number(used.n)) throw new HttpError(409, 'Move this role\'s admins to another role first.');
  await pool.query('DELETE FROM admin_roles WHERE id = ?', [id]);
  res.json({ ok: true });
});

const listAdmins = route(async (_req, res) => {
  const [rows] = await pool.query('SELECT u.id, u.username, u.name, u.email, u.phone, u.is_active, u.last_login_at, u.created_at, u.role_id, r.name AS role_name, r.code AS role_code FROM admin_users u JOIN admin_roles r ON r.id = u.role_id ORDER BY u.id');
  res.json({ items: rows });
});

async function activeSuperAdmins(conn, excludingId) {
  const [[row]] = await conn.query("SELECT COUNT(*) AS n FROM admin_users u JOIN admin_roles r ON r.id = u.role_id WHERE r.code = 'super_admin' AND u.is_active = 1 AND u.id <> ?", [excludingId || 0]);
  return Number(row.n);
}

const createAdmin = route(async (req, res) => {
  const b = req.body || {};
  const username = String(b.username || '').trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,80}$/.test(username)) throw new HttpError(400, 'Username must be 3–80 letters, numbers, dots, dashes or underscores.');
  const password = String(b.password || '');
  if (password.length < MIN_PASSWORD_LENGTH) throw new HttpError(400, `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  const [[role]] = await pool.query('SELECT id FROM admin_roles WHERE id = ?', [intParam(b.role_id, 'role')]);
  if (!role) throw new HttpError(400, 'Choose a valid role.');
  const hash = await hashPassword(password);
  const [r] = await pool.query('INSERT INTO admin_users (role_id, username, name, email, phone, password_hash, is_active) VALUES (?,?,?,?,?,?,1)',
    [role.id, username, text(b.name, 'Name', { max: 120, required: true }), text(b.email, 'Email', { max: 190 }), text(b.phone, 'Phone', { max: 30 }), hash]);
  await audit(req.adminUser.id, 'create', 'admin', r.insertId);
  res.status(201).json({ id: r.insertId });
});

const updateAdmin = route(async (req, res) => {
  const id = intParam(req.params.id);
  const b = req.body || {};
  await withTx(async (conn) => {
    const [[user]] = await conn.query('SELECT u.id, r.code FROM admin_users u JOIN admin_roles r ON r.id = u.role_id WHERE u.id = ? FOR UPDATE', [id]);
    if (!user) throw new HttpError(404, 'Admin not found.');
    const roleId = intParam(b.role_id, 'role');
    const [[role]] = await conn.query('SELECT code FROM admin_roles WHERE id = ?', [roleId]);
    if (!role) throw new HttpError(400, 'Choose a valid role.');
    const active = b.is_active === false ? 0 : 1;
    if (user.code === 'super_admin' && (role.code !== 'super_admin' || !active) && (await activeSuperAdmins(conn, id)) === 0) {
      throw new HttpError(409, 'At least one active super admin must remain.');
    }
    if (id === req.adminUser.id && !active) throw new HttpError(409, 'You cannot deactivate your own account.');
    await conn.query('UPDATE admin_users SET role_id = ?, name = ?, email = ?, phone = ?, is_active = ? WHERE id = ?',
      [roleId, text(b.name, 'Name', { max: 120, required: true }), text(b.email, 'Email', { max: 190 }), text(b.phone, 'Phone', { max: 30 }), active, id]);
    if (!active) await conn.query('UPDATE admin_sessions SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL', [id]);
  });
  await audit(req.adminUser.id, 'update', 'admin', id);
  res.json({ ok: true });
});

const resetPassword = route(async (req, res) => {
  const id = intParam(req.params.id);
  const password = String(req.body?.password || '');
  if (password.length < MIN_PASSWORD_LENGTH || password.length > 128) throw new HttpError(400, `Password must be ${MIN_PASSWORD_LENGTH}–128 characters.`);
  const hash = await hashPassword(password);
  const [r] = await pool.query('UPDATE admin_users SET password_hash = ?, failed_attempts = 0, locked_until = NULL WHERE id = ?', [hash, id]);
  if (!r.affectedRows) throw new HttpError(404, 'Admin not found.');
  await pool.query('UPDATE admin_sessions SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL', [id]);
  await audit(req.adminUser.id, 'reset_password', 'admin', id);
  res.json({ ok: true });
});

const changeOwnPassword = route(async (req, res) => {
  const { verifyPassword } = require('../../auth/password');
  const current = String(req.body?.currentPassword || '');
  const next = String(req.body?.newPassword || '');
  if (next.length < MIN_PASSWORD_LENGTH || next.length > 128) throw new HttpError(400, `New password must be ${MIN_PASSWORD_LENGTH}–128 characters.`);
  const [[user]] = await pool.query('SELECT password_hash FROM admin_users WHERE id = ?', [req.adminUser.id]);
  if (!(await verifyPassword(current, user.password_hash))) throw new HttpError(400, 'Current password is incorrect.');
  await pool.query('UPDATE admin_users SET password_hash = ? WHERE id = ?', [await hashPassword(next), req.adminUser.id]);
  res.json({ ok: true });
});

const activity = route(async (req, res) => {
  const [rows] = await pool.query('SELECT a.id, a.action, a.entity, a.entity_id, a.detail, a.created_at, u.username FROM activity_log a LEFT JOIN admin_users u ON u.id = a.admin_id ORDER BY a.id DESC LIMIT 200');
  res.json({ items: rows });
});

module.exports = { permissionCatalog, listRoles, createRole, updateRole, deleteRole, listAdmins, createAdmin, updateAdmin, resetPassword, changeOwnPassword, activity };
