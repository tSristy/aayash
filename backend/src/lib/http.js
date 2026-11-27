'use strict';

const { pool } = require('../../db');

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

// Wrap an async express handler: HttpError -> JSON error, anything else -> next().
function route(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res);
    } catch (error) {
      if (error instanceof HttpError) return res.status(error.status).json({ error: error.message });
      if (error && error.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'This value already exists.' });
      if (error && (error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451)) {
        return res.status(409).json({ error: 'This record is used elsewhere and cannot be deleted. Deactivate it instead.' });
      }
      if (error && error.code === 'ER_NO_REFERENCED_ROW_2') return res.status(400).json({ error: 'A linked record does not exist.' });
      return next(error);
    }
  };
}

// Run fn(connection) inside a transaction, committing or rolling back.
// Deadlocks (1213) and lock timeouts (1205) are retried: fn only touches the database
// inside the transaction, so re-running it from the start is safe.
async function withTx(fn, attempts = 4) {
  for (let attempt = 1; ; attempt += 1) {
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();
      const result = await fn(connection);
      await connection.commit();
      return result;
    } catch (error) {
      try { await connection.rollback(); } catch { /* connection already gone */ }
      const retryable = error && (error.errno === 1213 || error.errno === 1205);
      if (!retryable || attempt >= attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 20 * attempt + Math.random() * 40));
    } finally {
      connection.release();
    }
  }
}

function intParam(value, label = 'ID') {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 1) throw new HttpError(400, `Invalid ${label}.`);
  return n;
}

function money(value, label = 'Amount', { min = 0, max = 100000000, allowZero = true } = {}) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < min || n > max || (!allowZero && n === 0)) {
    throw new HttpError(400, `${label} is invalid.`);
  }
  return Math.round(n * 100) / 100;
}

function text(value, label, { max = 255, required = false } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new HttpError(400, `${label} is required.`);
    return null;
  }
  const s = String(value).trim();
  if (!s && required) throw new HttpError(400, `${label} is required.`);
  if (s.length > max) throw new HttpError(400, `${label} must be ${max} characters or fewer.`);
  return s || null;
}

function dateOnly(value, label = 'Date', { required = true } = {}) {
  if (value === undefined || value === null || value === '') {
    if (required) throw new HttpError(400, `${label} is required.`);
    return null;
  }
  const s = String(value).slice(0, 10);
  const t = Date.parse(`${s}T00:00:00Z`);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || !Number.isFinite(t) || new Date(t).toISOString().slice(0, 10) !== s) {
    throw new HttpError(400, `${label} is invalid.`);
  }
  return s;
}

// Local calendar date (the server's timezone is the business's timezone); toISOString() would be UTC and a day behind in Bangladesh overnight.
const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const today = () => localDate();
const daysAgo = (n) => localDate(new Date(Date.now() - n * 864e5));

function paging(query, { defaultLimit = 20, max = 100 } = {}) {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const limit = Math.min(max, Math.max(1, Number.parseInt(query.limit, 10) || defaultLimit));
  return { page, limit, offset: (page - 1) * limit };
}

function pageResult(rows, total, { page, limit }) {
  return { items: rows, page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

function likeEscape(value) {
  return String(value).replace(/[\\%_]/g, (c) => `\\${c}`);
}

async function audit(adminId, action, entity, entityId, detail, conn = pool) {
  try {
    await conn.query(
      'INSERT INTO activity_log (admin_id, action, entity, entity_id, detail) VALUES (?, ?, ?, ?, ?)',
      [adminId || null, action, entity || null, entityId == null ? null : String(entityId), detail ? String(detail).slice(0, 500) : null]
    );
  } catch { /* auditing must never block the business action */ }
}

module.exports = {
  localDate, daysAgo, HttpError, route, withTx, intParam, money, text, dateOnly, today, paging, pageResult, likeEscape, audit };
