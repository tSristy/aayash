'use strict';

/**
 * Lookups are separate from paginated list screens.
 * They use page/limit too, so product forms can load many options in batches
 * instead of silently truncating lists at the default 10 records.
 */
const { parseListQuery, searchWhere, paginationResult } = require('./catalog-pagination');

async function listLookup(req, res, model, columns = ['name']) {
  const list = parseListQuery(req.query);
  const where = searchWhere(list.search, columns);
  const result = await model.findAndCountAll({
    where,
    limit: list.limit,
    offset: list.offset,
    order: [['name', 'ASC'], ['id', 'ASC']],
  });

  res.json(paginationResult(result, list));
}

module.exports = { listLookup };
