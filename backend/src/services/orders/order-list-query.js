'use strict';

const { normalizePhone } = require('./order-policy');

const PAGE_LIMITS = [10, 20, 50, 100];
const STATUSES = [
  'placed', 'confirmed', 'packed', 'out_for_delivery', 'delivered', 'cancelled',
];
const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'];

function httpError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

function parseOrderList(query = {}) {
  const pageString = String(query.page ?? '1');
  const limitString = String(query.limit ?? '10');
  const page = Number(pageString);
  const limit = Number(limitString);
  const search = String(query.search ?? query.q ?? '').trim();
  const status = String(query.status || 'all');
  const payment = String(query.payment || 'all');
  const courier = String(query.courier || 'all');
  const from = String(query.from || '');
  const to = String(query.to || '');

  if (!/^\d+$/.test(pageString) || !Number.isSafeInteger(page) || page < 1 || page > 100000) {
    throw httpError('Page must be an integer from 1 to 100000.');
  }
  if (!/^\d+$/.test(limitString) || !PAGE_LIMITS.includes(limit)) {
    throw httpError('Rows per page must be 10, 20, 50 or 100.');
  }
  if (search.length > 100) {
    throw httpError('Search cannot exceed 100 characters.');
  }
  if (status !== 'all' && !STATUSES.includes(status)) {
    throw httpError('Invalid order status filter.');
  }
  if (payment !== 'all' && !PAYMENT_STATUSES.includes(payment)) {
    throw httpError('Invalid payment filter.');
  }
  if (courier !== 'all' && courier !== 'unassigned' && !/^[a-z][a-z0-9-]{1,39}$/.test(courier)) {
    throw httpError('Invalid courier filter.');
  }
  if ((from && !validDate(from)) || (to && !validDate(to)) || (from && to && from > to)) {
    throw httpError('Invalid date range.');
  }

  return {
    page,
    limit,
    offset: (page - 1) * limit,
    search,
    status,
    payment,
    courier,
    from,
    to,
  };
}

function buildOrderWhere(query, { includeStatus = true } = {}) {
  const clauses = [];
  const params = [];
  const number = normalizePhone(query.search);

  if (number) {
    const international = `880${number.slice(1)}`;
    clauses.push('o.guest_phone IN (?, ?, ?)');
    params.push(number, international, `+${international}`);
  } else if (query.search) {
    clauses.push(`(
      LOCATE(?, o.order_no) > 0 OR
      LOCATE(?, o.guest_name) > 0 OR
      LOCATE(?, o.guest_phone) > 0
    )`);
    params.push(query.search, query.search, query.search);
  }

  if (includeStatus && query.status !== 'all') {
    clauses.push('o.status = ?');
    params.push(query.status);
  }
  if (query.payment !== 'all') {
    clauses.push('o.payment_status = ?');
    params.push(query.payment);
  }
  if (query.from) {
    clauses.push('o.created_at >= ?');
    params.push(`${query.from} 00:00:00`);
  }
  if (query.to) {
    clauses.push('o.created_at < DATE_ADD(?, INTERVAL 1 DAY)');
    params.push(`${query.to} 00:00:00`);
  }
  if (query.courier !== 'all') {
    const active = "s.status IN ('booked', 'picked_up', 'in_transit', 'returning')";
    if (query.courier === 'unassigned') {
      clauses.push(`NOT EXISTS (
        SELECT 1 FROM courier_shipments s
        WHERE s.order_id = o.id AND ${active}
      )`);
    } else {
      clauses.push(`EXISTS (
        SELECT 1 FROM courier_shipments s
        JOIN courier_providers p ON p.id = s.provider_id
        WHERE s.order_id = o.id AND ${active} AND p.code = ?
      )`);
      params.push(query.courier);
    }
  }

  return {
    sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '',
    params,
  };
}

module.exports = { PAGE_LIMITS, STATUSES, parseOrderList, buildOrderWhere };
