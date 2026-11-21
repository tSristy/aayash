'use strict';

const { Op } = require('sequelize');

const PAGE_SIZES = Object.freeze([10, 20, 50, 100]);

function parsePositiveInteger(value, fallback) {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const text = String(value);
  if (!/^\d+$/.test(text)) {
    return null;
  }

  const parsed = Number(text);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
}

function parseListQuery(query = {}) {
  const page = parsePositiveInteger(query.page, 1);
  const limit = parsePositiveInteger(query.limit, 10);

  if (page === null || page > 100000) {
    const error = new Error('Page must be a positive integer (maximum 100000).');
    error.status = 400;
    throw error;
  }

  if (!PAGE_SIZES.includes(limit)) {
    const error = new Error('Limit must be one of: 10, 20, 50, 100.');
    error.status = 400;
    throw error;
  }

  if (query.q !== undefined && typeof query.q !== 'string') {
    const error = new Error('Search must be a text value.');
    error.status = 400;
    throw error;
  }

  const search = (query.q || '').trim();
  if (search.length > 100) {
    const error = new Error('Search must be 100 characters or fewer.');
    error.status = 400;
    throw error;
  }

  return { page, limit, search, offset: (page - 1) * limit };
}

function escapeLike(value) {
  // MySQL / MariaDB use backslash to escape LIKE wildcards.
  return value.replace(/[\\%_]/g, character => `\\${character}`);
}

function searchWhere(search, columns) {
  if (!search) {
    return {};
  }

  const pattern = `%${escapeLike(search)}%`;
  return {
    [Op.or]: columns.map(column => ({
      [column]: { [Op.like]: pattern },
    })),
  };
}

function booleanStatus(value) {
  if (!value || value === 'all') {
    return {};
  }

  if (value === 'active') {
    return { is_active: true };
  }

  if (value === 'archived') {
    return { is_active: false };
  }

  const error = new Error('Status must be active, archived or all.');
  error.status = 400;
  throw error;
}

function positiveIdFilter(value, label) {
  if (value === undefined || value === null || value === '' || value === 'all') {
    return null;
  }

  const parsed = parsePositiveInteger(value, null);
  if (parsed === null || parsed > 2147483647) {
    const error = new Error(`${label} must be a valid record ID.`);
    error.status = 400;
    throw error;
  }

  return parsed;
}

function paginationResult(result, list, items = result.rows) {
  const total = Number(result.count);
  const totalPages = Math.max(1, Math.ceil(total / list.limit));

  return {
    items,
    page: list.page,
    limit: list.limit,
    total,
    totalPages,
    hasPreviousPage: list.page > 1,
    hasNextPage: list.page < totalPages,
  };
}

module.exports = {
  PAGE_SIZES,
  parseListQuery,
  searchWhere,
  booleanStatus,
  positiveIdFilter,
  paginationResult,
};
