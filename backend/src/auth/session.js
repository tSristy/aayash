'use strict';
const { randomBytes, createHash } = require('node:crypto');
const { Op } = require('sequelize');
const { AdminUser, AdminRole, AdminSession } = require('../models');

const COOKIE = 'ayashmart_admin_sid';
const ABSOLUTE_MS = 8 * 60 * 60 * 1000;
const IDLE_MS = 30 * 60 * 1000;
const hashToken = (raw) => createHash('sha256').update(raw).digest('hex');
const isProd = process.env.NODE_ENV === 'production';
const cookieOptions = { httpOnly: true, sameSite: 'lax', secure: isProd, path: '/', maxAge: ABSOLUTE_MS };

function getCookie(req) {
  const part = (req.headers.cookie || '').split(';').map((s) => s.trim()).find((s) => s.startsWith(`${COOKIE}=`));
  const value = part ? part.slice(COOKIE.length + 1) : '';
  return /^[0-9a-f]{64}$/.test(value) ? value : null;
}

function publicUser(user) {
  return { id: user.id, username: user.username, name: user.name, role: user.role?.code || null };
}

async function makeSession(user, res) {
  const token = randomBytes(32).toString('hex');
  const now = new Date();
  await AdminSession.create({ user_id: user.id, token_hash: hashToken(token),
    expires_at: new Date(now.getTime() + ABSOLUTE_MS), last_seen_at: now, created_at: now });
  res.cookie(COOKIE, token, cookieOptions);
}

async function findSession(req) {
  const token = getCookie(req);
  if (!token) return null;
  const now = new Date();
  const session = await AdminSession.findOne({
    where: { token_hash: hashToken(token), revoked_at: null,
      expires_at: { [Op.gt]: now }, last_seen_at: { [Op.gt]: new Date(now.getTime() - IDLE_MS) } },
    include: [{ model: AdminUser, as: 'user', required: true, where: { is_active: true },
      include: [{ model: AdminRole, as: 'role', required: true }] }],
  });
  if (session) await session.update({ last_seen_at: now });
  return session;
}

function requireAdmin(...allowedRoles) {
  return async (req, res, next) => {
    try {
      const session = await findSession(req);
      if (!session) return res.status(401).json({ error: 'Authentication required.' });
      if (allowedRoles.length && !allowedRoles.includes(session.user.role.code)) return res.status(403).json({ error: 'Not permitted.' });
      req.adminUser = session.user;
      return next();
    } catch (error) { next(error); }
  };
}

module.exports = { COOKIE, cookieOptions, getCookie, publicUser, makeSession, findSession, hashToken, requireAdmin };
