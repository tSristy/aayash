'use strict';

const { pool } = require('../../../db');
const { HttpError, route, intParam, text, paging, pageResult, likeEscape, audit } = require('../../lib/http');
const { normalizePhone } = require('../../services/orders/order-policy');

const STATS_SQL = `
  COALESCE((SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id), 0) AS orders_count,
  COALESCE((SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id AND o.status IN ('delivered','partial_delivered')), 0) AS delivered_count,
  COALESCE((SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id AND o.status = 'cancelled'), 0) AS cancelled_count,
  COALESCE((SELECT COUNT(*) FROM orders o WHERE o.customer_id = c.id AND o.status IN ('returned','return_pending')), 0) AS returned_count,
  COALESCE((SELECT SUM(o.collected_amount) FROM orders o WHERE o.customer_id = c.id AND o.status IN ('delivered','partial_delivered')), 0) AS spent,
  (SELECT MAX(o.created_at) FROM orders o WHERE o.customer_id = c.id) AS last_order_at`;

function tagFor(c) {
  if (c.is_blocked) return 'Blocked';
  if (Number(c.delivered_count) >= 5) return 'VIP';
  if (Number(c.delivered_count) >= 1) return 'Regular';
  return 'New';
}

const shape = (c) => ({
  ...c, password_hash: undefined, orders_count: Number(c.orders_count), delivered_count: Number(c.delivered_count),
  cancelled_count: Number(c.cancelled_count), returned_count: Number(c.returned_count), spent: Number(c.spent), tag: tagFor(c),
  success_rate: Number(c.orders_count) ? Math.round((Number(c.delivered_count) / Number(c.orders_count)) * 100) : null,
});

const list = route(async (req, res) => {
  const page = paging(req.query);
  const where = [];
  const params = [];
  if (req.query.q) {
    const q = String(req.query.q).trim().slice(0, 100);
    const phone = normalizePhone(q);
    if (phone) { where.push('c.phone = ?'); params.push(phone); } else {
      const like = `%${likeEscape(q)}%`; where.push('(c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)'); params.push(like, like, like);
    }
  }
  if (req.query.blocked === '1') where.push('c.is_blocked = 1');
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const sort = { recent: 'last_order_at DESC', orders: 'orders_count DESC', spent: 'spent DESC', newest: 'c.id DESC' }[req.query.sort || 'newest'] || 'c.id DESC';
  const [[count]] = await pool.query(`SELECT COUNT(*) AS n FROM customers c ${clause}`, params);
  const [rows] = await pool.query(`SELECT c.id, c.name, c.phone, c.email, c.city, c.is_blocked, c.block_reason, c.created_at, ${STATS_SQL} FROM customers c ${clause} ORDER BY ${sort} LIMIT ? OFFSET ?`, [...params, page.limit, page.offset]);
  res.json(pageResult(rows.map(shape), Number(count.n), page));
});

const detail = route(async (req, res) => {
  const id = intParam(req.params.id);
  const [[customer]] = await pool.query(`SELECT c.*, ${STATS_SQL} FROM customers c WHERE c.id = ?`, [id]);
  if (!customer) throw new HttpError(404, 'Customer not found.');
  const [orders] = await pool.query('SELECT id, order_no, status, total, source, created_at FROM orders WHERE customer_id = ? ORDER BY id DESC LIMIT 50', [id]);
  const [[ips]] = await pool.query('SELECT GROUP_CONCAT(DISTINCT ip_address) AS ips FROM orders WHERE customer_id = ?', [id]);
  res.json({ ...shape(customer), orders: orders.map((o) => ({ ...o, total: Number(o.total) })), ips: (ips.ips || '').split(',').filter(Boolean).slice(0, 10) });
});

const update = route(async (req, res) => {
  const id = intParam(req.params.id);
  const b = req.body || {};
  const name = text(b.name, 'Name', { max: 120, required: true });
  const email = text(b.email, 'Email', { max: 190 });
  const [r] = await pool.query('UPDATE customers SET name = ?, email = ?, address = ?, city = ?, note = ? WHERE id = ?',
    [name, email, text(b.address, 'Address', { max: 255 }), text(b.city, 'City', { max: 120 }), text(b.note, 'Note', { max: 500 }), id]);
  if (!r.affectedRows) throw new HttpError(404, 'Customer not found.');
  res.json({ ok: true });
});

const block = route(async (req, res) => {
  const id = intParam(req.params.id);
  const reason = text(req.body?.reason, 'Reason', { max: 255 });
  const [[c]] = await pool.query('SELECT phone FROM customers WHERE id = ?', [id]);
  if (!c) throw new HttpError(404, 'Customer not found.');
  await pool.query('UPDATE customers SET is_blocked = 1, block_reason = ? WHERE id = ?', [reason, id]);
  await pool.query("INSERT IGNORE INTO blocklist (kind, value, reason, admin_id) VALUES ('phone', ?, ?, ?)", [c.phone, reason, req.adminUser.id]);
  await audit(req.adminUser.id, 'block', 'customer', id, reason);
  res.json({ ok: true });
});

const unblock = route(async (req, res) => {
  const id = intParam(req.params.id);
  const [[c]] = await pool.query('SELECT phone FROM customers WHERE id = ?', [id]);
  if (!c) throw new HttpError(404, 'Customer not found.');
  await pool.query('UPDATE customers SET is_blocked = 0, block_reason = NULL WHERE id = ?', [id]);
  await pool.query("DELETE FROM blocklist WHERE kind = 'phone' AND value = ?", [c.phone]);
  await audit(req.adminUser.id, 'unblock', 'customer', id);
  res.json({ ok: true });
});

// Block by phone number or IP address, even without a customer record.
const listBlocklist = route(async (_req, res) => {
  const [rows] = await pool.query('SELECT b.*, u.username AS admin FROM blocklist b LEFT JOIN admin_users u ON u.id = b.admin_id ORDER BY b.id DESC LIMIT 500');
  res.json({ items: rows });
});
const addBlock = route(async (req, res) => {
  const kind = req.body?.kind === 'ip' ? 'ip' : 'phone';
  let value = String(req.body?.value || '').trim();
  if (kind === 'phone') { value = normalizePhone(value); if (!value) throw new HttpError(400, 'Enter a valid Bangladesh mobile number.'); }
  else if (!/^[0-9a-fA-F:.]{3,64}$/.test(value)) throw new HttpError(400, 'Enter a valid IP address.');
  await pool.query('INSERT INTO blocklist (kind, value, reason, admin_id) VALUES (?,?,?,?)', [kind, value, text(req.body?.reason, 'Reason', { max: 255 }), req.adminUser.id]);
  if (kind === 'phone') await pool.query('UPDATE customers SET is_blocked = 1 WHERE phone = ?', [value]);
  res.status(201).json({ ok: true });
});
const removeBlock = route(async (req, res) => {
  const id = intParam(req.params.id);
  const [[b]] = await pool.query('SELECT kind, value FROM blocklist WHERE id = ?', [id]);
  if (b?.kind === 'phone') await pool.query('UPDATE customers SET is_blocked = 0, block_reason = NULL WHERE phone = ?', [b.value]);
  await pool.query('DELETE FROM blocklist WHERE id = ?', [id]);
  res.json({ ok: true });
});

module.exports = { list, detail, update, block, unblock, listBlocklist, addBlock, removeBlock };
