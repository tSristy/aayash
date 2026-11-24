'use strict';

const { pool } = require('../../../db');
const { route } = require('./shared');

async function query(sql, parameters = []) {
  const [rows] = await pool.query(sql, parameters);
  return rows;
}

const dashboard = route(async (_req, res) => {
  const [orderStats, productStats, recentOrders, categorySales, statusCounts] = await Promise.all([
    query(`
      SELECT COUNT(*) AS total_orders,
             COALESCE(SUM(CASE WHEN status = 'delivered' THEN total ELSE 0 END), 0)
               AS delivered_value
      FROM orders
    `),
    query(`
      SELECT
        (SELECT COUNT(*) FROM products WHERE status = 'active' AND is_active = 1)
          AS active_products,
        (SELECT COUNT(*) FROM product_variants WHERE stock <= 5)
          AS low_stock_variants
    `),
    query(`
      SELECT o.id, o.order_no, o.guest_name, o.status, o.total, o.created_at,
             GROUP_CONCAT(oi.name ORDER BY oi.id SEPARATOR ', ') AS items
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      GROUP BY o.id, o.order_no, o.guest_name, o.status, o.total, o.created_at
      ORDER BY o.id DESC
      LIMIT 8
    `),
    query(`
      SELECT c.name, SUM(oi.line_total) AS amount
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id AND o.status = 'delivered'
      JOIN products p ON p.id = oi.product_id
      JOIN categories c ON c.id = p.category_id
      GROUP BY c.id, c.name
      ORDER BY amount DESC
      LIMIT 5
    `),
    query('SELECT status, COUNT(*) AS total FROM orders GROUP BY status'),
  ]);

  res.set('Cache-Control', 'no-store');
  res.json({
    stats: {
      totalOrders: Number(orderStats[0]?.total_orders || 0),
      deliveredValue: Number(orderStats[0]?.delivered_value || 0),
      activeProducts: Number(productStats[0]?.active_products || 0),
      lowStockVariants: Number(productStats[0]?.low_stock_variants || 0),
    },
    recentOrders: recentOrders.map((item) => ({
      id: item.order_no,
      customer: item.guest_name,
      items: item.items || '',
      date: item.created_at,
      amount: Number(item.total),
      status: item.status,
    })),
    categorySales: categorySales.map((item) => ({
      name: item.name,
      amount: Number(item.amount),
    })),
    statusCounts: statusCounts.map((item) => ({
      status: item.status,
      total: Number(item.total),
    })),
  });
});

module.exports = { dashboard };
