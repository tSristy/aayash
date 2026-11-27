'use strict';

const { randomBytes, createHash } = require('node:crypto');
const { pool } = require('../../db');

const COOKIE = 'ayashmart_customer_sid';
const MAX_MS = 30 * 24 * 60 * 60 * 1000;
const hash = (raw) => createHash('sha256').update(raw).digest('hex');
const options = { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: MAX_MS };

function cookieValue(req) {
  const part = (req.headers.cookie || '').split(';').map((s) => s.trim()).find((s) => s.startsWith(`${COOKIE}=`));
  const value = part ? part.slice(COOKIE.length + 1) : '';
  return /^[0-9a-f]{64}$/.test(value) ? value : null;
}

async function startSession(customerId, res) {
  const token = randomBytes(32).toString('hex');
  await pool.query('INSERT INTO customer_sessions (customer_id, token_hash, expires_at) VALUES (?, ?, ?)', [customerId, hash(token), new Date(Date.now() + MAX_MS)]);
  res.cookie(COOKIE, token, options);
}

async function currentCustomer(req) {
  const token = cookieValue(req);
  if (!token) return null;
  const [[row]] = await pool.query(`
    SELECT c.id, c.name, c.phone, c.email, c.address, c.city, c.avatar_url, c.is_blocked
    FROM customer_sessions s JOIN customers c ON c.id = s.customer_id
    WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > NOW()`, [hash(token)]);
  return row && !row.is_blocked ? row : null;
}

async function endSession(req, res) {
  const token = cookieValue(req);
  if (token) await pool.query('UPDATE customer_sessions SET revoked_at = NOW() WHERE token_hash = ?', [hash(token)]);
  res.clearCookie(COOKIE, { httpOnly: true, sameSite: 'lax', secure: options.secure, path: '/' });
}

module.exports = { COOKIE, startSession, currentCustomer, endSession };
