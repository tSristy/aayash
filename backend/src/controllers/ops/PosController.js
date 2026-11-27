'use strict';

const { pool } = require('../../../db');
const { HttpError, route, withTx, intParam, paging, pageResult, likeEscape, dateOnly, audit } = require('../../lib/http');
const { createOrderCore, changeStatusTx } = require('../../services/orders/order-service');

const sale = route(async (req, res) => {
  const b = req.body || {};
  const created = await withTx((conn) => createOrderCore(conn, {
    customer: { name: b.customer?.name, phone: b.customer?.phone }, address: {}, items: b.items || [], note: b.note,
    discountOverride: b.discount, orderType: 'pos', source: 'pos', paidAmount: b.paidAmount, accountId: b.accountId ? intParam(b.accountId, 'account') : null,
    paymentMethod: ['cash', 'card', 'mobile'].includes(b.paymentMethod) ? b.paymentMethod : 'cash',
  }, { adminId: req.adminUser.id }));
  await audit(req.adminUser.id, 'pos_sale', 'order', created.id);
  res.status(201).json({ id: created.id, order_no: created.order_no, total: created.total, paid: Math.min(created.total, Number(b.paidAmount ?? created.total)), change: Math.max(0, Number(b.paidAmount ?? 0) - created.total) });
});

const listSales = route(async (req, res) => {
  const list = paging(req.query);
  const where = ["o.order_type = 'pos'"];
  const params = [];
  if (req.query.q) {
    const like = `%${likeEscape(String(req.query.q).slice(0, 100))}%`;
    where.push('(o.order_no LIKE ? OR o.guest_name LIKE ? OR o.guest_phone LIKE ?)'); params.push(like, like, like);
  }
  const from = dateOnly(req.query.from, 'From date', { required: false });
  const to = dateOnly(req.query.to, 'To date', { required: false });
  if (from) { where.push('o.created_at >= ?'); params.push(`${from} 00:00:00`); }
  if (to) { where.push('o.created_at < DATE_ADD(?, INTERVAL 1 DAY)'); params.push(`${to} 00:00:00`); }
  if (req.query.status === 'returned') where.push("o.status = 'returned'"); else if (req.query.status === 'completed') where.push("o.status = 'delivered'");
  const clause = `WHERE ${where.join(' AND ')}`;
  const [[count]] = await pool.query(`SELECT COUNT(*) AS n, COALESCE(SUM(CASE WHEN o.status = 'delivered' THEN o.total END),0) AS revenue FROM orders o ${clause}`, params);
  const [rows] = await pool.query(`
    SELECT o.id, o.order_no, o.guest_name, o.guest_phone, o.total, o.paid_amount, o.discount, o.status, o.created_at, u.username AS cashier,
           (SELECT COALESCE(SUM(qty),0) FROM order_items i WHERE i.order_id = o.id) AS qty
    FROM orders o LEFT JOIN admin_users u ON u.id = o.created_by_admin_id ${clause} ORDER BY o.id DESC LIMIT ? OFFSET ?`, [...params, list.limit, list.offset]);
  res.json({ ...pageResult(rows.map((r) => ({ ...r, total: Number(r.total), paid_amount: Number(r.paid_amount), qty: Number(r.qty), due: Math.max(0, Number(r.total) - Number(r.paid_amount)) })), Number(count.n), list), revenue: Number(count.revenue) });
});

const returnSale = route(async (req, res) => {
  const id = intParam(req.params.id, 'sale ID');
  await withTx(async (conn) => {
    const [[order]] = await conn.query("SELECT id, order_type, status FROM orders WHERE id = ? FOR UPDATE", [id]);
    if (!order || order.order_type !== 'pos') throw new HttpError(404, 'POS sale not found.');
    if (order.status !== 'delivered') throw new HttpError(409, 'Only completed sales can be returned.');
    await changeStatusTx(conn, id, 'return_pending', { adminId: req.adminUser.id });
    await changeStatusTx(conn, id, 'returned', { adminId: req.adminUser.id });
  });
  res.json({ ok: true });
});

module.exports = { sale, listSales, returnSale };
