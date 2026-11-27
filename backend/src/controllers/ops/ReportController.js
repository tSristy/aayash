'use strict';

const { pool } = require('../../../db');
const { HttpError, route, dateOnly, today, daysAgo, localDate } = require('../../lib/http');
const { STATUS_LABELS, STATUSES } = require('../../services/orders/workflow');
const { balances } = require('../../services/accounts/ledger');

// "7", "30", "today", "all" or explicit from/to.
function range(query) {
  const now = today();
  const shift = (days) => daysAgo(days);
  if (query.from || query.to) {
    const from = dateOnly(query.from, 'From date', { required: false }) || '2000-01-01';
    const to = dateOnly(query.to, 'To date', { required: false }) || now;
    if (from > to) throw new HttpError(400, 'From date must not be after To date.');
    return { from, to, label: 'custom' };
  }
  const key = String(query.range || '30');
  if (key === 'today') return { from: now, to: now, label: 'today' };
  if (key === 'yesterday') return { from: shift(1), to: shift(1), label: 'yesterday' };
  if (key === 'all') return { from: '2000-01-01', to: now, label: 'all' };
  const days = Math.min(365, Math.max(1, Number(key) || 30));
  return { from: shift(days - 1), to: now, label: `${days}d` };
}
const bounds = (r) => [`${r.from} 00:00:00`, `${r.to} 00:00:00`];
const SOLD = "('delivered','partial_delivered')";

const dashboard = route(async (req, res) => {
  const r = range(req.query);
  const [lo, hi] = bounds(r);
  const win = 'o.created_at >= ? AND o.created_at < DATE_ADD(?, INTERVAL 1 DAY)';

  const [[statusRows], [draftRow], [daily], [sources], [top], [kpi], [recent], [attn], [incomeRows], [expenseRows], [incomeList], [expenseList], [newCustomers]] = await Promise.all([
    pool.query(`SELECT o.status, COUNT(*) AS n, COALESCE(SUM(o.total),0) AS amount FROM orders o WHERE ${win} GROUP BY o.status`, [lo, hi]),
    pool.query("SELECT COUNT(*) AS n, COALESCE(SUM(subtotal),0) AS amount FROM checkout_drafts WHERE status = 'open' AND created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY)", [lo, hi]),
    pool.query(`SELECT DATE(o.created_at) AS day, COUNT(*) AS orders, COALESCE(SUM(CASE WHEN o.status NOT IN ('cancelled') THEN o.total END),0) AS value,
                COALESCE(SUM(CASE WHEN o.status IN ${SOLD} THEN COALESCE(o.collected_amount, o.total) END),0) AS revenue
                FROM orders o WHERE ${win} GROUP BY DATE(o.created_at) ORDER BY day`, [lo, hi]),
    pool.query(`SELECT o.source, COUNT(*) AS n, COALESCE(SUM(o.total),0) AS amount FROM orders o WHERE ${win} AND o.status <> 'cancelled' GROUP BY o.source ORDER BY n DESC`, [lo, hi]),
    pool.query(`SELECT oi.product_id, oi.name, SUM(oi.qty) AS qty, SUM(oi.line_total) AS amount
                FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE ${win} AND o.status <> 'cancelled'
                GROUP BY oi.product_id, oi.name ORDER BY qty DESC LIMIT 6`, [lo, hi]),
    pool.query(`SELECT COUNT(*) AS orders, COALESCE(SUM(CASE WHEN o.status IN ${SOLD} THEN COALESCE(o.collected_amount, o.total) END),0) AS revenue,
                COALESCE(SUM(CASE WHEN o.status <> 'cancelled' THEN o.total END),0) AS booked,
                COALESCE(SUM(o.order_type = 'pos'),0) AS pos_orders,
                COALESCE(SUM(CASE WHEN o.order_type = 'pos' AND o.status = 'delivered' THEN o.total END),0) AS pos_revenue
                FROM orders o WHERE ${win}`, [lo, hi]),
    pool.query(`SELECT o.id, o.order_no, o.guest_name, o.total, o.status, o.created_at, o.source FROM orders o ORDER BY o.id DESC LIMIT 8`),
    pool.query(`SELECT
        (SELECT COUNT(*) FROM product_variants v JOIN products p ON p.id = v.product_id WHERE p.status = 'active' AND p.is_combo = 0 AND v.stock <= p.low_stock_level) AS low_stock,
        (SELECT COUNT(*) FROM contact_messages WHERE status = 'new') AS messages,
        (SELECT COUNT(*) FROM reviews WHERE status = 'pending') AS reviews,
        (SELECT COUNT(*) FROM bills WHERE status = 'unpaid' AND due_date IS NOT NULL AND due_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY)) AS bills_due,
        (SELECT COUNT(*) FROM orders WHERE status = 'placed') AS new_orders`),
    pool.query("SELECT COALESCE(p.name, 'Uncategorised') AS purpose, SUM(t.amount) AS amount FROM transactions t LEFT JOIN account_purposes p ON p.id = t.purpose_id WHERE t.kind = 'income' AND t.txn_date BETWEEN ? AND ? GROUP BY purpose ORDER BY amount DESC", [r.from, r.to]),
    pool.query("SELECT COALESCE(p.name, 'Uncategorised') AS purpose, SUM(t.amount) AS amount FROM transactions t LEFT JOIN account_purposes p ON p.id = t.purpose_id WHERE t.kind = 'expense' AND t.txn_date BETWEEN ? AND ? GROUP BY purpose ORDER BY amount DESC", [r.from, r.to]),
    pool.query("SELECT t.id, t.amount, t.txn_date, t.note, p.name AS purpose FROM transactions t LEFT JOIN account_purposes p ON p.id = t.purpose_id WHERE t.kind = 'income' ORDER BY t.id DESC LIMIT 5"),
    pool.query("SELECT t.id, t.amount, t.txn_date, t.note, p.name AS purpose FROM transactions t LEFT JOIN account_purposes p ON p.id = t.purpose_id WHERE t.kind = 'expense' ORDER BY t.id DESC LIMIT 5"),
    pool.query('SELECT COUNT(*) AS n FROM customers WHERE created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY)', [lo, hi]),
  ]);

  const byStatus = Object.fromEntries(statusRows.map((s) => [s.status, { count: Number(s.n), amount: Number(s.amount) }]));
  const tiles = [{ key: 'placed', label: STATUS_LABELS.placed, ...(byStatus.placed || { count: 0, amount: 0 }) },
    { key: 'incomplete', label: 'Incomplete', count: Number(draftRow[0].n), amount: Number(draftRow[0].amount) }];
  for (const key of STATUSES.filter((s) => s !== 'placed')) tiles.push({ key, label: STATUS_LABELS[key], ...(byStatus[key] || { count: 0, amount: 0 }) });
  const all = { count: statusRows.reduce((s, x) => s + Number(x.n), 0), amount: statusRows.reduce((s, x) => s + Number(x.amount), 0) };
  const incomeTotal = incomeRows.reduce((s, x) => s + Number(x.amount), 0);
  const expenseTotal = expenseRows.reduce((s, x) => s + Number(x.amount), 0);
  const accountBalances = await balances(pool);

  res.json({
    range: r, tiles, all,
    kpis: {
      orders: Number(kpi[0].orders), revenue: Number(kpi[0].revenue), booked: Number(kpi[0].booked),
      averageOrder: Number(kpi[0].orders) ? Number(kpi[0].booked) / Math.max(1, Number(kpi[0].orders) - (byStatus.cancelled?.count || 0)) : 0,
      posOrders: Number(kpi[0].pos_orders), posRevenue: Number(kpi[0].pos_revenue), newCustomers: Number(newCustomers[0].n),
      cashBalance: accountBalances.filter((a) => a.is_active).reduce((s, a) => s + a.balance, 0),
    },
    daily: daily.map((d) => ({ day: d.day, orders: Number(d.orders), value: Number(d.value), revenue: Number(d.revenue) })),
    sources: sources.map((s) => ({ source: s.source, count: Number(s.n), amount: Number(s.amount) })),
    topProducts: top.map((t) => ({ ...t, qty: Number(t.qty), amount: Number(t.amount) })),
    recentOrders: recent.map((o) => ({ ...o, total: Number(o.total), status_label: STATUS_LABELS[o.status] })),
    attention: { lowStock: Number(attn[0].low_stock), messages: Number(attn[0].messages), reviews: Number(attn[0].reviews), billsDue: Number(attn[0].bills_due), newOrders: Number(attn[0].new_orders), incomplete: Number(draftRow[0].n) },
    income: { total: incomeTotal, byPurpose: incomeRows.map((x) => ({ purpose: x.purpose, amount: Number(x.amount) })), recent: incomeList.map((x) => ({ ...x, amount: Number(x.amount) })) },
    expense: { total: expenseTotal, byPurpose: expenseRows.map((x) => ({ purpose: x.purpose, amount: Number(x.amount) })), recent: expenseList.map((x) => ({ ...x, amount: Number(x.amount) })) },
  });
});

// Revenue counts delivered quantities only, so partial deliveries and returns are accurate.
const SOLD_LINES = `
  FROM order_items oi JOIN orders o ON o.id = oi.order_id
  LEFT JOIN products p ON p.id = oi.product_id LEFT JOIN categories c ON c.id = p.category_id
  WHERE o.status IN ${SOLD} AND o.created_at >= ? AND o.created_at < DATE_ADD(?, INTERVAL 1 DAY)`;
const QTY = 'COALESCE(oi.delivered_qty, oi.qty)';

const salesReport = route(async (req, res) => {
  const r = range(req.query);
  const [lo, hi] = bounds(r);
  const group = ['day', 'product', 'category', 'source', 'month'].includes(req.query.group) ? req.query.group : 'day';
  const key = {
    day: 'DATE(o.created_at)', month: "DATE_FORMAT(o.created_at, '%Y-%m')", product: "CONCAT(oi.name, ' (', oi.variant_label, ')')",
    category: "COALESCE(c.name, 'Uncategorised')", source: 'o.source',
  }[group];
  const [rows] = await pool.query(`
    SELECT ${key} AS label, COUNT(DISTINCT o.id) AS orders, SUM(${QTY}) AS qty,
           SUM(oi.unit_price * ${QTY}) AS revenue, SUM(COALESCE(oi.unit_cost,0) * ${QTY}) AS cost
    ${SOLD_LINES} GROUP BY label ORDER BY ${group === 'day' || group === 'month' ? 'label' : 'revenue DESC'} LIMIT 1000`, [lo, hi]);
  const items = rows.map((x) => ({ label: group === 'day' && x.label instanceof Date ? localDate(x.label) : String(x.label), orders: Number(x.orders), qty: Number(x.qty), revenue: Number(x.revenue), cost: Number(x.cost), profit: Number(x.revenue) - Number(x.cost) }));
  const totals = items.reduce((t, x) => ({ orders: t.orders + x.orders, qty: t.qty + x.qty, revenue: t.revenue + x.revenue, cost: t.cost + x.cost, profit: t.profit + x.profit }), { orders: 0, qty: 0, revenue: 0, cost: 0, profit: 0 });
  res.json({ range: r, group, items, totals });
});

const profitLoss = route(async (req, res) => {
  const r = range(req.query);
  const [lo, hi] = bounds(r);
  const [[lines]] = await pool.query(`SELECT COALESCE(SUM(oi.unit_price * ${QTY}),0) AS revenue, COALESCE(SUM(COALESCE(oi.unit_cost,0) * ${QTY}),0) AS cogs ${SOLD_LINES}`, [lo, hi]);
  const [[orders]] = await pool.query(`SELECT COALESCE(SUM(discount),0) AS discount, COALESCE(SUM(delivery_fee),0) AS delivery, COUNT(*) AS n FROM orders o WHERE o.status IN ${SOLD} AND o.created_at >= ? AND o.created_at < DATE_ADD(?, INTERVAL 1 DAY)`, [lo, hi]);
  const [[damage]] = await pool.query('SELECT COALESCE(SUM(qty * unit_cost),0) AS loss FROM damage_records WHERE created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY)', [lo, hi]);
  // Inventory purchases and sales returns are not operating expenses.
  const [opex] = await pool.query(`SELECT COALESCE(p.name,'Uncategorised') AS purpose, SUM(t.amount) AS amount FROM transactions t LEFT JOIN account_purposes p ON p.id = t.purpose_id
    WHERE t.kind = 'expense' AND t.txn_date BETWEEN ? AND ? AND COALESCE(p.name,'') NOT IN ('Purchase','Sales return','Damage loss') GROUP BY purpose ORDER BY amount DESC`, [r.from, r.to]);
  const [other] = await pool.query(`SELECT COALESCE(SUM(t.amount),0) AS amount FROM transactions t JOIN account_purposes p ON p.id = t.purpose_id WHERE t.kind = 'income' AND p.name NOT IN ('Sales','Purchase refund') AND t.txn_date BETWEEN ? AND ?`, [r.from, r.to]);
  const revenue = Number(lines.revenue);
  const discount = Number(orders.discount);
  const delivery = Number(orders.delivery);
  const netSales = revenue - discount + delivery;
  const cogs = Number(lines.cogs);
  const gross = netSales - cogs;
  const expenses = opex.reduce((s, x) => s + Number(x.amount), 0);
  const otherIncome = Number(other[0].amount);
  const damageLoss = Number(damage.loss);
  res.json({
    range: r, orders: Number(orders.n), revenue, discount, delivery, netSales, cogs, grossProfit: gross, otherIncome,
    expenses: opex.map((x) => ({ purpose: x.purpose, amount: Number(x.amount) })), totalExpenses: expenses, damageLoss,
    netProfit: gross + otherIncome - expenses - damageLoss,
    note: 'Revenue counts delivered quantities of Delivered and Partial Delivered orders. Cost of goods uses the cost price recorded when each order was placed.',
  });
});

const stockSummary = route(async (req, res) => {
  const r = range(req.query);
  const [lo, hi] = bounds(r);
  const [rows] = await pool.query(`
    SELECT v.id, v.sku, v.label, p.name, v.stock AS closing_now, v.cost_price,
      COALESCE((SELECT m.balance_after FROM stock_movements m WHERE m.variant_id = v.id AND m.created_at < ? ORDER BY m.id DESC LIMIT 1), 0) AS opening,
      COALESCE(SUM(CASE WHEN m.movement_type IN ('purchase','opening') OR (m.movement_type IN ('adjustment','return_restock','cancel_restock','exchange') AND m.qty_change > 0) THEN m.qty_change END),0) AS stock_in,
      COALESCE(-SUM(CASE WHEN m.movement_type IN ('sale','pos_sale') THEN m.qty_change END),0) AS sold,
      COALESCE(-SUM(CASE WHEN m.movement_type = 'damage' THEN m.qty_change END),0) AS damaged,
      COALESCE(-SUM(CASE WHEN m.movement_type IN ('adjustment','exchange') AND m.qty_change < 0 THEN m.qty_change END),0) AS adjusted_out
    FROM product_variants v JOIN products p ON p.id = v.product_id
    LEFT JOIN stock_movements m ON m.variant_id = v.id AND m.created_at >= ? AND m.created_at < DATE_ADD(?, INTERVAL 1 DAY)
    WHERE p.is_combo = 0 GROUP BY v.id, v.sku, v.label, p.name, v.stock, v.cost_price ORDER BY p.name, v.id LIMIT 3000`, [lo, lo, hi]);
  const items = rows.map((x) => ({ ...x, closing_now: Number(x.closing_now), cost_price: Number(x.cost_price), opening: Number(x.opening), stock_in: Number(x.stock_in), sold: Number(x.sold), damaged: Number(x.damaged), adjusted_out: Number(x.adjusted_out), value: Number(x.closing_now) * Number(x.cost_price) }));
  res.json({ range: r, items, totalValue: items.reduce((s, x) => s + x.value, 0), totalUnits: items.reduce((s, x) => s + x.closing_now, 0) });
});

const courierReport = route(async (req, res) => {
  const r = range(req.query);
  const [lo, hi] = bounds(r);
  const [rows] = await pool.query(`
    SELECT p.name AS courier, COUNT(*) AS shipments, SUM(s.status = 'delivered') AS delivered, SUM(s.status IN ('returning','returned')) AS returned,
           SUM(s.status IN ('booked','picked_up','in_transit')) AS active, COALESCE(SUM(CASE WHEN s.status = 'delivered' THEN s.cod_amount END),0) AS cod_delivered,
           COALESCE(SUM(CASE WHEN s.status IN ('booked','picked_up','in_transit') THEN s.cod_amount END),0) AS cod_pending
    FROM courier_shipments s JOIN courier_providers p ON p.id = s.provider_id
    WHERE s.created_at >= ? AND s.created_at < DATE_ADD(?, INTERVAL 1 DAY) GROUP BY p.id, p.name ORDER BY shipments DESC`, [lo, hi]);
  res.json({ range: r, items: rows.map((x) => ({ courier: x.courier, shipments: Number(x.shipments), delivered: Number(x.delivered), returned: Number(x.returned), active: Number(x.active), cod_delivered: Number(x.cod_delivered), cod_pending: Number(x.cod_pending), success_rate: Number(x.shipments) ? Math.round((Number(x.delivered) / Number(x.shipments)) * 100) : 0 })) });
});

module.exports = { dashboard, salesReport, profitLoss, stockSummary, courierReport };
