'use strict';
const { UniqueConstraintError, ForeignKeyConstraintError } = require('sequelize');
function route(handler) {
  return async (req, res, next) => {
    try { await handler(req, res); }
    catch (err) {
      if (err.status && err.status >= 400 && err.status < 500) return res.status(err.status).json({ error: err.message });
      if (err instanceof UniqueConstraintError) return res.status(409).json({ error: 'This name or slug already exists.' });
      if (err instanceof ForeignKeyConstraintError) return res.status(409).json({ error: 'Record is referenced by another item.' });
      next(err);
    }
  };
}
function notFound(res) { return res.status(404).json({ error: 'Record not found.' }); }
module.exports = { route, notFound };
