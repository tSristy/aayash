'use strict';

const express = require('express');
const crypto = require('node:crypto');
const { pool } = require('../../../db');
const { HttpError, route, text } = require('../../lib/http');
const { publicRateLimit } = require('../../middleware/public-rate-limit');
const { hashPassword, verifyPassword } = require('../../auth/password');
const { startSession, currentCustomer, endSession } = require('../../auth/customer-session');
const { normalizePhone } = require('../../services/orders/order-policy');
const { STATUS_LABELS } = require('../../services/orders/workflow');
const settings = require('../../services/settings');

const router = express.Router();
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

const pub = (c) => ({ id: c.id, name: c.name, phone: c.phone, email: c.email, address: c.address, city: c.city, avatar_url: c.avatar_url });
const dummy = hashPassword('nonexistent-customer-password');

router.post('/auth/register', publicRateLimit({ max: 8 }), route(async (req, res) => {
  const b = req.body || {};
  const phone = normalizePhone(b.phone);
  if (!phone) throw new HttpError(400, 'Enter a valid Bangladesh mobile number.');
  const password = String(b.password || '');
  if (password.length < 6 || password.length > 128) throw new HttpError(400, 'Password must be 6–128 characters.');
  const name = text(b.name, 'Name', { max: 120, required: true });
  const email = text(b.email, 'Email', { max: 190 });
  const [[existing]] = await pool.query('SELECT id, password_hash, is_blocked FROM customers WHERE phone = ?', [phone]);
  if (existing?.is_blocked) throw new HttpError(403, 'This account cannot be used. Please contact support.');
  if (existing?.password_hash) throw new HttpError(409, 'An account with this phone already exists. Please sign in.');
  const hash = await hashPassword(password);
  let id;
  if (existing) { await pool.query('UPDATE customers SET name = ?, password_hash = ?, email = COALESCE(email, ?) WHERE id = ?', [name, hash, email, existing.id]); id = existing.id; }
  else { const [r] = await pool.query('INSERT INTO customers (name, phone, email, password_hash) VALUES (?,?,?,?)', [name, phone, email, hash]); id = r.insertId; }
  await startSession(id, res);
  const [[customer]] = await pool.query('SELECT * FROM customers WHERE id = ?', [id]);
  res.status(201).json({ customer: pub(customer) });
}));

router.post('/auth/login', publicRateLimit({ max: 10 }), route(async (req, res) => {
  const phone = normalizePhone(req.body?.phone);
  const password = String(req.body?.password || '').slice(0, 128);
  const [[customer]] = phone ? await pool.query('SELECT * FROM customers WHERE phone = ?', [phone]) : [[]];
  const ok = await verifyPassword(password, customer?.password_hash || await dummy);
  if (!customer || !customer.password_hash || !ok || customer.is_blocked) throw new HttpError(401, 'Incorrect phone number or password.');
  await pool.query('UPDATE customers SET last_login_at = NOW() WHERE id = ?', [customer.id]);
  await startSession(customer.id, res);
  res.json({ customer: pub(customer) });
}));

router.post('/auth/logout', route(async (req, res) => { await endSession(req, res); res.json({ ok: true }); }));

router.get('/me', route(async (req, res) => {
  const customer = await currentCustomer(req);
  if (!customer) throw new HttpError(401, 'Not signed in.');
  res.json({ customer: pub(customer) });
}));

router.put('/me', route(async (req, res) => {
  const customer = await currentCustomer(req);
  if (!customer) throw new HttpError(401, 'Not signed in.');
  await pool.query('UPDATE customers SET name = ?, address = ?, city = ? WHERE id = ?', [text(req.body?.name, 'Name', { max: 120, required: true }), text(req.body?.address, 'Address', { max: 255 }), text(req.body?.city, 'City', { max: 120 }), customer.id]);
  res.json({ ok: true });
}));

router.get('/orders', route(async (req, res) => {
  const customer = await currentCustomer(req);
  if (!customer) throw new HttpError(401, 'Not signed in.');
  const [rows] = await pool.query('SELECT order_no, status, total, created_at FROM orders WHERE customer_id = ? ORDER BY id DESC LIMIT 50', [customer.id]);
  res.json({ items: rows.map((o) => ({ ...o, total: Number(o.total), status_label: STATUS_LABELS[o.status] })) });
}));

// ------------------------------------------------------------- social login
// The callback goes through the storefront origin (/api/customer/... is proxied to this server).
async function siteUrl() {
  const configured = String(await settings.get('public_site_url')).replace(/\/$/, '');
  return configured || (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',')[0].trim().replace(/\/$/, '');
}
const stateCookie = 'ayashmart_oauth_state';
const cookieOpts = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 10 * 60 * 1000 };

function providerConfig(provider) {
  if (provider === 'google') return { enabledKey: 'google_login_enabled', id: 'google_client_id', secret: 'google_client_secret', idField: 'google_id' };
  if (provider === 'facebook') return { enabledKey: 'facebook_login_enabled', id: 'facebook_app_id', secret: 'facebook_app_secret', idField: 'facebook_id' };
  throw new HttpError(404, 'Unknown sign-in provider.');
}

router.get('/auth/:provider/start', route(async (req, res) => {
  const cfg = providerConfig(req.params.provider);
  const all = await settings.getAll();
  if (all[cfg.enabledKey] !== '1' || !all[cfg.id] || !all[cfg.secret]) throw new HttpError(503, 'This sign-in method is not configured yet.');
  const state = crypto.randomBytes(24).toString('hex');
  res.cookie(stateCookie, state, cookieOpts);
  const redirect = `${await siteUrl()}/api/customer/auth/${req.params.provider}/callback`;
  const url = req.params.provider === 'google'
    ? `https://accounts.google.com/o/oauth2/v2/auth?${new URLSearchParams({ client_id: all[cfg.id], redirect_uri: redirect, response_type: 'code', scope: 'openid email profile', state, prompt: 'select_account' })}`
    : `https://www.facebook.com/v25.0/dialog/oauth?${new URLSearchParams({ client_id: all[cfg.id], redirect_uri: redirect, state, scope: 'email,public_profile' })}`;
  res.redirect(url);
}));

router.get('/auth/:provider/callback', route(async (req, res) => {
  const base = await siteUrl();
  const fail = (why) => res.redirect(`${base}/account?error=${encodeURIComponent(why)}`);
  const cfg = providerConfig(req.params.provider);
  const cookieState = (req.headers.cookie || '').split(';').map((s) => s.trim()).find((s) => s.startsWith(`${stateCookie}=`))?.slice(stateCookie.length + 1);
  res.clearCookie(stateCookie, { path: '/' });
  if (!req.query.code || !req.query.state || !cookieState || req.query.state !== cookieState) return fail('Sign-in could not be verified. Please try again.');
  const all = await settings.getAll();
  const redirect = `${base}/api/customer/auth/${req.params.provider}/callback`;
  let profile;
  try {
    if (req.params.provider === 'google') {
      const token = await (await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, signal: AbortSignal.timeout(15000),
        body: new URLSearchParams({ code: String(req.query.code), client_id: all[cfg.id], client_secret: all[cfg.secret], redirect_uri: redirect, grant_type: 'authorization_code' }) })).json();
      if (!token.access_token) return fail('Google sign-in failed.');
      const info = await (await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${token.access_token}` }, signal: AbortSignal.timeout(15000) })).json();
      profile = { id: info.sub, name: info.name, email: info.email_verified ? info.email : null, avatar: info.picture };
    } else {
      const token = await (await fetch(`https://graph.facebook.com/v25.0/oauth/access_token?${new URLSearchParams({ client_id: all[cfg.id], client_secret: all[cfg.secret], redirect_uri: redirect, code: String(req.query.code) })}`, { signal: AbortSignal.timeout(15000) })).json();
      if (!token.access_token) return fail('Facebook sign-in failed.');
      const info = await (await fetch(`https://graph.facebook.com/v25.0/me?${new URLSearchParams({ fields: 'id,name,email,picture', access_token: token.access_token })}`, { signal: AbortSignal.timeout(15000) })).json();
      profile = { id: info.id, name: info.name, email: info.email, avatar: info.picture?.data?.url };
    }
  } catch { return fail('Could not reach the sign-in provider. Please try again.'); }
  if (!profile?.id) return fail('Sign-in failed.');

  let [[customer]] = await pool.query(`SELECT * FROM customers WHERE ${cfg.idField} = ?`, [profile.id]);
  if (!customer && profile.email) [[customer]] = await pool.query('SELECT * FROM customers WHERE email = ?', [profile.email]);
  if (customer?.is_blocked) return fail('This account cannot be used.');
  if (customer) {
    await pool.query(`UPDATE customers SET ${cfg.idField} = ?, avatar_url = COALESCE(avatar_url, ?), last_login_at = NOW() WHERE id = ?`, [profile.id, profile.avatar || null, customer.id]);
  } else {
    // Social accounts have no phone yet; a unique placeholder is replaced when the customer orders.
    const placeholder = `${req.params.provider}:${profile.id}`.slice(0, 30);
    const [r] = await pool.query(`INSERT INTO customers (name, phone, email, ${cfg.idField}, avatar_url, last_login_at) VALUES (?,?,?,?,?,NOW())`, [String(profile.name || 'Customer').slice(0, 120), placeholder, profile.email || null, profile.id, profile.avatar || null]);
    customer = { id: r.insertId };
  }
  await startSession(customer.id, res);
  res.redirect(`${base}/account`);
}));

module.exports = router;
