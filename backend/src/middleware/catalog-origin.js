'use strict';
const { CORS_ORIGIN } = require('../../config');
const allowed = new Set(CORS_ORIGIN.split(',').map(s => s.trim()).filter(Boolean));
// Browser mutating requests must originate from an explicitly approved admin UI.
function requireCatalogWriteOrigin(req, res, next) {
  const origin = req.get('origin');
  if (!origin || !allowed.has(origin) || req.get('sec-fetch-site') === 'cross-site') {
    return res.status(403).json({ error: 'Untrusted or missing request origin.' });
  }
  next();
}
module.exports = { requireCatalogWriteOrigin };
