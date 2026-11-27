'use strict';

const { HttpError, route, intParam } = require('../../lib/http');
const settings = require('../../services/settings');
const { mask } = require('../../lib/secrets');
const { pool } = require('../../../db');

const getSettings = route(async (_req, res) => {
  const all = await settings.getAll();
  const out = {};
  for (const [key, def] of Object.entries(settings.SETTINGS)) out[key] = def.secret ? mask(all[key]) : (all[key] ?? '');
  const [accounts] = await pool.query('SELECT id, name FROM accounts WHERE is_active = 1 ORDER BY name');
  res.json({ values: out, groups: Object.fromEntries(Object.entries(settings.SETTINGS).map(([k, d]) => [k, d.group])), fonts: settings.FONTS, accounts });
});

const putSettings = route(async (req, res) => {
  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const allowedGroups = req.allowedGroups;
  const values = {};
  for (const [key, value] of Object.entries(body)) {
    const def = settings.SETTINGS[key];
    if (!def) continue;
    if (allowedGroups && !allowedGroups.includes(def.group)) throw new HttpError(403, 'You cannot change that setting.');
    values[key] = value;
  }
  try { await settings.setMany(values); } catch (error) { throw new HttpError(error.status || 400, error.message); }
  res.json({ ok: true });
});

// Restrict which setting groups a route may change (website vs general settings).
const onlyGroups = (...groups) => (req, _res, next) => { req.allowedGroups = groups; next(); };

module.exports = { getSettings, putSettings, onlyGroups };
