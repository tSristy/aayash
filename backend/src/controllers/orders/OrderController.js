'use strict';

const { pool } = require('../../../db');
const { parseOrderList, buildOrderWhere } = require('../../services/orders/order-list-query');
const {
  createPublicOrderNumber,
  isPublicOrderNumber,
  maskCustomerName,
  maskCustomerPhone,
} = require('../../services/orders/order-number');
const {
  normalizePhone,
  shippingForCity,
  hashTrackingCode,
  validTrackingCode,
  canChangeStatus,
} = require('../../services/orders/order-policy');

class OrderError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function asyncRoute(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res);
    } catch (error) {
      if (error instanceof OrderError) {
        return res.status(error.status).json({ error: error.message });
      }

      return next(error);
    }
  };
}

function validateCheckout(body) {
  const customer = body?.customer || {};
  const address = body?.address || {};
  const phone = normalizePhone(customer.phone);
  const shipping = shippingForCity(address.city);
  const trackingCode = body?.trackingCode;

  if (typeof customer.name !== 'string' || !customer.name.trim() || customer.name.length > 120) {
    throw new OrderError(400, 'A valid customer name is required.');
  }

  if (!phone) {
    throw new OrderError(400, 'Enter a valid Bangladesh mobile number.');
  }

  if (typeof address.line1 !== 'string' || !address.line1.trim() || address.line1.length > 255) {
    throw new OrderError(400, 'A valid delivery address is required.');
  }

  if (!shipping) {
    throw new OrderError(400, 'Select a supported delivery city.');
  }

  if (!validTrackingCode(trackingCode)) {
    throw new OrderError(400, 'A secure checkout tracking code is required.');
  }

  if (body?.paymentMethod !== 'cod') {
    throw new OrderError(400, 'Only Cash on Delivery is available until online payment is integrated.');
  }

  if (body.note != null && (typeof body.note !== 'string' || body.note.length > 500)) {
    throw new OrderError(400, 'Order note is too long.');
  }

  if (body.couponCode && (typeof body.couponCode !== 'string' || body.couponCode.length > 40)) {
    throw new OrderError(400, 'Invalid coupon code.');
  }

  if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 30) {
    throw new OrderError(400, 'Your cart must contain 1–30 items.');
  }

  const wanted = new Map();

  for (const item of body.items) {
    const variantId = Number(item?.variantId);
    const qty = Number(item?.qty);

    if (!Number.isSafeInteger(variantId) || variantId <= 0 || !Number.isInteger(qty) || qty < 1 || qty > 20) {
      throw new OrderError(400, 'An item quantity or variant is invalid.');
    }

    wanted.set(variantId, (wanted.get(variantId) || 0) + qty);

    if (wanted.get(variantId) > 20) {
      throw new OrderError(400, 'Maximum quantity per variant is 20.');
    }
  }

  return { customer, address, phone, shipping, trackingCode, wanted };
}

function receipt(order) {
  return {
    orderNo: order.order_no,
    subtotal: Number(order.subtotal),
    discount: Number(order.discount),
    deliveryFee: Number(order.delivery_fee),
    total: Number(order.total),
    status: order.status,
  };
}

const createOrder = asyncRoute(async (req, res) => {
  const data = validateCheckout(req.body);
  const trackingHash = hashTrackingCode(data.trackingCode);
  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    // Idempotent checkout: retries carrying the same code return one order.
    await connection.beginTransaction();
    transactionStarted = true;

    const [[previous]] = await connection.query(
      'SELECT * FROM orders WHERE tracking_token_hash = ? FOR UPDATE',
      [trackingHash]
    );

    if (previous) {
      await connection.commit();
      transactionStarted = false;
      return res.status(200).json(receipt(previous));
    }

    const lines = [];
    const ids = [...data.wanted.keys()].sort((a, b) => a - b);

    for (const id of ids) {
      const [[variant]] = await connection.query(`
        SELECT v.id, v.label, v.price, v.stock, p.id AS product_id, p.name
        FROM product_variants v
        JOIN products p ON p.id = v.product_id
        WHERE v.id = ? AND p.is_active = 1 AND p.status = 'active'
        FOR UPDATE
      `, [id]);

      const qty = data.wanted.get(id);

      if (!variant) {
        throw new OrderError(400, 'A product in your cart is unavailable.');
      }

      if (variant.stock < qty) {
        throw new OrderError(409, `Only ${variant.stock} left of ${variant.name} (${variant.label}).`);
      }

      const priceCents = Math.round(Number(variant.price) * 100);

      lines.push({
        ...variant,
        qty,
        priceCents,
        lineTotalCents: priceCents * qty,
      });
    }

    const subtotalCents = lines.reduce((sum, item) => sum + item.lineTotalCents, 0);
    let discountCents = 0;
    let coupon = null;

    if (req.body.couponCode) {
      const [[found]] = await connection.query(`
        SELECT * FROM coupons
        WHERE code = ? AND is_active = 1
        AND (expires_at IS NULL OR expires_at > NOW())
      `, [req.body.couponCode.trim()]);

      if (!found || subtotalCents < Math.round(Number(found.min_order) * 100)) {
        throw new OrderError(400, 'The coupon is invalid for this order.');
      }

      coupon = found;
      const proposedDiscount = found.discount_type === 'percent'
        ? Math.round(subtotalCents * Number(found.discount_value) / 100)
        : Math.round(Number(found.discount_value) * 100);

      discountCents = Math.min(subtotalCents, Math.max(0, proposedDiscount));
    }

    const deliveryCents = data.shipping.fee * 100;
    const order = {
      order_no: createPublicOrderNumber(),
      subtotal: subtotalCents / 100,
      discount: discountCents / 100,
      delivery_fee: deliveryCents / 100,
      total: (subtotalCents - discountCents + deliveryCents) / 100,
      status: 'placed',
    };

    const [created] = await connection.query(`
      INSERT INTO orders (
        order_no, guest_name, guest_phone, address_line, area, city,
        note, payment_method, payment_status, subtotal, delivery_fee,
        discount, total, coupon_id, tracking_token_hash,
        stock_accounting_version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 'cod', 'pending', ?, ?, ?, ?, ?, ?, 2)
    `, [
      order.order_no,
      data.customer.name.trim(),
      data.phone,
      data.address.line1.trim(),
      typeof data.address.area === 'string' ? data.address.area.trim().slice(0, 120) : null,
      data.shipping.city,
      req.body.note?.trim() || null,
      order.subtotal,
      order.delivery_fee,
      order.discount,
      order.total,
      coupon?.id || null,
      trackingHash,
    ]);

    await connection.query(`
      INSERT INTO order_status_history (order_id, old_status, new_status)
      VALUES (?, NULL, 'placed')
    `, [created.insertId]);

    for (const line of lines) {
      await connection.query(`
        INSERT INTO order_items (
          order_id, product_id, variant_id, name, variant_label,
          unit_price, qty, line_total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        created.insertId,
        line.product_id,
        line.id,
        line.name,
        line.label,
        line.priceCents / 100,
        line.qty,
        line.lineTotalCents / 100,
      ]);

      await connection.query(
        'UPDATE product_variants SET stock = stock - ? WHERE id = ?',
        [line.qty, line.id]
      );
    }

    await connection.commit();
    transactionStarted = false;
    return res.status(201).json(receipt(order));
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    // Concurrent retries may hit the unique index. Resolve without placing
    // a second order or decrementing stock twice.
    if (error.code === 'ER_DUP_ENTRY') {
      const [existing] = await pool.query(
        'SELECT * FROM orders WHERE tracking_token_hash = ?',
        [trackingHash]
      );

      if (existing[0]) {
        return res.status(200).json(receipt(existing[0]));
      }
    }

    throw error;
  } finally {
    connection.release();
  }
});

const trackOrder = asyncRoute(async (req, res) => {
  const orderNo = String(req.body?.orderNo || '').trim().toUpperCase();

  // Legacy AEM numbers were issued with a separate private tracking code.
  // Never downgrade those older, potentially shared identifiers to public lookup.
  if (!isPublicOrderNumber(orderNo)) {
    throw new OrderError(404, 'Order not found. For an older order, contact support.');
  }

  const [orders] = await pool.query(`
    SELECT id, order_no, created_at, guest_name, guest_phone,
           status, subtotal, delivery_fee, discount, total
    FROM orders
    WHERE order_no = ?
    LIMIT 1
  `, [orderNo]);

  const order = orders[0];

  if (!order) {
    throw new OrderError(404, 'Order not found. Please check your order number.');
  }

  const [items] = await pool.query(`
    SELECT name, variant_label, qty, line_total
    FROM order_items
    WHERE order_id = ?
    ORDER BY id
  `, [order.id]);

  const [[shipment]] = await pool.query(`
    SELECT p.name AS provider, s.status, s.updated_at
    FROM courier_shipments s
    JOIN courier_providers p ON p.id = s.provider_id
    WHERE s.order_id = ?
    ORDER BY s.id DESC LIMIT 1
  `, [order.id]);

  res.set('Cache-Control', 'no-store');
  return res.json({
    courier: shipment || null,
    order_no: order.order_no,
    created_at: order.created_at,
    customer_name_masked: maskCustomerName(order.guest_name),
    customer_phone_masked: maskCustomerPhone(order.guest_phone),
    status: order.status,
    subtotal: order.subtotal,
    delivery_fee: order.delivery_fee,
    discount: order.discount,
    total: order.total,
    items,
  });
});

// Recognize local and international representations saved by legacy checkouts.
function phoneSearchVariants(phone) {
  const normalized = normalizePhone(phone);
  if (!normalized) return [phone];

  const international = `880${normalized.slice(1)}`;
  return [normalized, international, `+${international}`];
}

const listOrders = asyncRoute(async (req, res) => {
  let query;

  try {
    query = parseOrderList(req.query);
  } catch (error) {
    throw new OrderError(error.status || 400, error.message);
  }

  const filtered = buildOrderWhere(query);
  const statusScope = buildOrderWhere(query, { includeStatus: false });

  const [[counts], [statusRows], [items]] = await Promise.all([
    pool.query(`
      SELECT COUNT(*) AS total FROM orders o ${filtered.sql}
    `, filtered.params),
    pool.query(`
      SELECT o.status, COUNT(*) AS total
      FROM orders o ${statusScope.sql}
      GROUP BY o.status
    `, statusScope.params),
    pool.query(`
      SELECT o.id, o.order_no, o.guest_name, o.guest_phone,
             o.created_at, o.status, o.payment_status, o.total,
             (
               SELECT p.name FROM courier_shipments s
               JOIN courier_providers p ON p.id = s.provider_id
               WHERE s.order_id = o.id
               ORDER BY s.id DESC LIMIT 1
             ) AS courier_name,
             EXISTS (
               SELECT 1 FROM courier_shipments active_shipment
               WHERE active_shipment.order_id = o.id
                 AND active_shipment.status IN ('booked', 'picked_up', 'in_transit')
             ) AS has_active_shipment
      FROM orders o ${filtered.sql}
      ORDER BY o.id DESC
      LIMIT ? OFFSET ?
    `, [...filtered.params, query.limit, query.offset]),
  ]);

  const total = Number(counts[0]?.total || 0);
  const totalPages = Math.max(1, Math.ceil(total / query.limit));
  const statusCounts = Object.fromEntries(
    statusRows.map((row) => [row.status, Number(row.total)])
  );

  res.set('Cache-Control', 'no-store');
  res.json({
    items,
    page: query.page,
    limit: query.limit,
    total,
    totalPages,
    hasPreviousPage: query.page > 1,
    hasNextPage: query.page < totalPages,
    statusCounts,
  });
});

const getOrderDetail = asyncRoute(async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isSafeInteger(id) || id < 1) {
    throw new OrderError(400, 'Invalid order ID.');
  }

  const [orders] = await pool.query(`
    SELECT id, order_no, guest_name, guest_phone, address_line, area, city,
           note, payment_method, payment_status, status, subtotal,
           delivery_fee, discount, total, created_at
    FROM orders WHERE id = ? LIMIT 1
  `, [id]);

  const order = orders[0];
  if (!order) {
    throw new OrderError(404, 'Order not found.');
  }

  const [[summary], [previousOrders], [items], [history]] = await Promise.all([
    pool.query(`
      SELECT COUNT(*) AS total_orders,
             COALESCE(SUM(status = 'delivered'), 0) AS delivered_orders,
             COALESCE(SUM(status = 'cancelled'), 0) AS cancelled_orders
      FROM orders WHERE guest_phone IN (?, ?, ?)
    `, phoneSearchVariants(order.guest_phone)),
    pool.query(`
      SELECT id, order_no, status, total, created_at
      FROM orders WHERE guest_phone IN (?, ?, ?)
      ORDER BY id DESC LIMIT 20
    `, phoneSearchVariants(order.guest_phone)),
    pool.query(`
      SELECT id, name, variant_label, qty, unit_price, line_total
      FROM order_items WHERE order_id = ? ORDER BY id
    `, [id]),
    pool.query(`
      SELECT h.old_status, h.new_status, h.created_at, u.username AS changed_by
      FROM order_status_history h
      LEFT JOIN admin_users u ON u.id = h.changed_by_admin_id
      WHERE h.order_id = ? ORDER BY h.id
    `, [id]),
  ]);

  res.set('Cache-Control', 'no-store');
  return res.json({
    order,
    items,
    history,
    customerHistory: {
      totalOrders: Number(summary[0]?.total_orders || 0),
      deliveredOrders: Number(summary[0]?.delivered_orders || 0),
      cancelledOrders: Number(summary[0]?.cancelled_orders || 0),
      recentOrders: previousOrders,
    },
  });
});

const changeOrderStatus = asyncRoute(async (req, res) => {
  const id = Number(req.params.id);
  const nextStatus = req.body?.status;

  if (!Number.isSafeInteger(id) || id <= 0 || typeof nextStatus !== 'string') {
    throw new OrderError(400, 'Invalid order or status.');
  }

  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const [[order]] = await connection.query(
      'SELECT id, status, stock_accounting_version FROM orders WHERE id = ? FOR UPDATE',
      [id]
    );

    if (!order) {
      throw new OrderError(404, 'Order not found.');
    }

    if (order.status === nextStatus) {
      await connection.commit();
      transactionStarted = false;
      return res.json({ ok: true, status: nextStatus });
    }

    if (!canChangeStatus(order.status, nextStatus)) {
      throw new OrderError(409, `Cannot move order from ${order.status} to ${nextStatus}.`);
    }

    // Dispatch requires a recorded active shipment. No parcel can move to
    // Out for Delivery without a courier being selected and booked first.
    if (nextStatus === 'out_for_delivery') {
      const [bookings] = await connection.query(`
        SELECT id FROM courier_shipments
        WHERE order_id = ? AND status IN ('booked', 'picked_up', 'in_transit')
        LIMIT 1
      `, [id]);
      if (bookings.length === 0) {
        throw new OrderError(409,
          'Record an active courier shipment before marking Out for Delivery.');
      }
    }

    const [items] = await connection.query(
      'SELECT variant_id, product_id, qty FROM order_items WHERE order_id = ? ORDER BY variant_id',
      [id]
    );

    // A placed order reserves units by immediately reducing sellable stock.
    // Cancelled orders release those units only once, inside this transaction.
    if (nextStatus === 'cancelled') {
      const [activeShipments] = await connection.query(`
        SELECT id FROM courier_shipments
        WHERE order_id = ? AND status IN (
          'booked', 'picked_up', 'in_transit', 'returning'
        ) LIMIT 1
      `, [id]);

      if (activeShipments.length) {
        throw new OrderError(409,
          'Cancel the active courier shipment first, after confirming with the courier.');
      }

      for (const item of items) {
        await connection.query(
          'UPDATE product_variants SET stock = stock + ? WHERE id = ?',
          [item.qty, item.variant_id]
        );

        // Legacy orders already incremented sold_count on placement.
        if (Number(order.stock_accounting_version) === 1) {
          await connection.query(`
            UPDATE products
            SET sold_count = GREATEST(0, sold_count - ?)
            WHERE id = ?
          `, [item.qty, item.product_id]);
        }
      }
    }

    // New orders count as sold only when actually delivered.
    if (nextStatus === 'delivered' && Number(order.stock_accounting_version) === 2) {
      for (const item of items) {
        await connection.query(
          'UPDATE products SET sold_count = sold_count + ? WHERE id = ?',
          [item.qty, item.product_id]
        );
      }
    }

    await connection.query('UPDATE orders SET status = ? WHERE id = ?', [nextStatus, id]);
    await connection.query(`
      INSERT INTO order_status_history (
        order_id, old_status, new_status, changed_by_admin_id
      ) VALUES (?, ?, ?, ?)
    `, [id, order.status, nextStatus, req.adminUser.id]);

    await connection.commit();
    transactionStarted = false;
    return res.json({ ok: true, status: nextStatus });
  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    throw error;
  } finally {
    connection.release();
  }
});


module.exports = {
  OrderError,
  createOrder,
  trackOrder,
  listOrders,
  getOrderDetail,
  changeOrderStatus,
};
