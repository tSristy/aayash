'use strict';

const { pool } = require('../../../db');
const { phoneVariants, summarizeHistory } = require('../../services/risk/customer-history');

async function orderHistory(req, res, next) {
  try {
    const orderId = Number(req.params.orderId);
    if (!Number.isSafeInteger(orderId) || orderId < 1) {
      return res.status(400).json({ error: 'Invalid order ID.' });
    }

    const [[order]] = await pool.query(
      'SELECT guest_phone FROM orders WHERE id = ? LIMIT 1',
      [orderId]
    );

    if (!order) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const phoneNumbers = phoneVariants(order.guest_phone);
    if (!phoneNumbers.length) {
      return res.json({ ...summarizeHistory({}), phoneMatch: 'unavailable' });
    }

    const [[summary]] = await pool.query(`
      SELECT COUNT(*) AS total_orders,
             COALESCE(SUM(status = 'delivered'), 0) AS delivered_orders,
             COALESCE(SUM(status = 'cancelled'), 0) AS cancelled_orders
      FROM orders WHERE guest_phone IN (?, ?, ?)
    `, phoneNumbers);

    res.set('Cache-Control', 'no-store');
    return res.json({ ...summarizeHistory(summary), phoneMatch: 'exact_normalized' });
  } catch (error) {
    return next(error);
  }
}

module.exports = { orderHistory };
