'use strict';
const express = require('express');
const { Op } = require('sequelize');
const { AdminUser, AdminRole, AdminSession } = require('../models');
const { hashPassword, verifyPassword } = require('../auth/password');
const { COOKIE, cookieOptions, getCookie, publicUser, makeSession, findSession, hashToken, requireAdmin } = require('../auth/session');
const { CORS_ORIGIN } = require('../../config');
const router = express.Router();
const attempts = new Map();
const WINDOW = 15 * 60 * 1000;
const ALLOWED = new Set(CORS_ORIGIN.split(',').map((s) => s.trim()));
const dummyHashPromise = hashPassword('nonexistent-dummy-password-for-timing');
const noCache = (_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); };
router.use(noCache);

router.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    const origin = req.get('origin');
    if ((origin && !ALLOWED.has(origin)) || req.get('sec-fetch-site') === 'cross-site') {
      return res.status(403).json({ error: 'Invalid request origin.' });
    }
  }
  next();
});

router.post('/login', async (req, res, next) => {
  try {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim().toLowerCase() : '';
    const password = req.body?.password;
    if (!/^[a-z0-9._-]{3,80}$/.test(username) || typeof password !== 'string' || password.length > 128) {
      return res.status(400).json({ error: 'Enter a valid username and password.' });
    }
    const key = `${req.ip}:${username}`;
    const now = Date.now();
    if (attempts.size > 20000) attempts.clear(); // For multi-node deployments use shared Redis throttling.
    const prior = attempts.get(key);
    if (prior && prior.until > now && prior.count >= 5) {
      res.set('Retry-After', String(Math.ceil((prior.until - now) / 1000)));
      return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
    }
    const user = await AdminUser.findOne({ where: { username }, include: [{ model: AdminRole, as: 'role' }] });
    const ok = await verifyPassword(password, user?.password_hash || await dummyHashPromise);
    const locked = user?.locked_until && new Date(user.locked_until).getTime() > now;
    if (!user || !user.is_active || !ok || locked) {
      const nextCount = (!prior || prior.until <= now ? 0 : prior.count) + 1;
      attempts.set(key, { count: nextCount, until: now + WINDOW });
      if (user && !locked) {
        await user.update({
          failed_attempts: user.failed_attempts + 1,
          locked_until: user.failed_attempts + 1 >= 5 ? new Date(now + WINDOW) : null
        });
      }
      return res.status(401).json({ error: 'Incorrect username or password.' });
    }
    attempts.delete(key);
    await user.update({ failed_attempts: 0, locked_until: null, last_login_at: new Date() });
    // Invalidate old browser login if it exists; new session always has a fresh token.
    const old = getCookie(req);
    if (old) await AdminSession.update({ revoked_at: new Date() }, { where: { token_hash: hashToken(old), revoked_at: null } });
    await makeSession(user, res);
    res.json({ user: publicUser(user) });
  } catch (error) { next(error); }
});

router.get('/me', async (req, res, next) => {
  try {
    const session = await findSession(req);
    if (!session) return res.status(401).json({ error: 'Authentication required.' });
    res.json({ user: publicUser(session.user) });
  } catch (error) { next(error); }
});

router.post('/logout', async (req, res, next) => {
  try {
    const token = getCookie(req);
    if (token) await AdminSession.update({ revoked_at: new Date() }, { where: { token_hash: hashToken(token), revoked_at: null } });
    res.clearCookie(COOKIE, { httpOnly: true, sameSite: cookieOptions.sameSite, secure: cookieOptions.secure, path: '/' });
    res.json({ ok: true });
  } catch (error) { next(error); }
});

router.get('/probe', requireAdmin('super_admin'), (_req, res) => res.json({ ok: true, admin: true }));
module.exports = router;
