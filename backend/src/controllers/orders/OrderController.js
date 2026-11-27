'use strict';

const { pool } = require('../../../db');
const { HttpError, route, withTx, intParam, paging, pageResult, likeEscape, audit, dateOnly, today, daysAgo } = require('../../lib/http');
const { isPublicOrderNumber, maskCustomerName, maskCustomerPhone } = require('../../services/orders/order-number');
const { normalizePhone, hashTrackingCode, validTrackingCode } = require('../../services/orders/order-policy');
const { STATUS_LABELS, STATUSES, EDITABLE } = require('../../services/orders/workflow');
const { createOrderCore, changeStatusTx, editOrder } = require('../../services/orders/order-service');
const { applyLines } = require('../../services/inventory/stock');

const asyncRoute = route;
const OrderError = HttpError;

const IMAGE_SQL = `COALESCE(NULLIF(p.image_url, ''), (SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order, pi.id LIMIT 1))`;

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

// ------------------------------------------------------------------ public
const createOrder = asyncRoute(async (req, res) => {
  const body = req.body || {};
  if (!validTrackingCode(body.trackingCode)) throw new HttpError(400, 'A secure checkout tracking code is required.');
  if (body.paymentMethod !== 'cod') throw new HttpError(400, 'Only Cash on Delivery is available until online payment is integrated.');
  if (body.note != null && (typeof body.note !== 'string' || body.note.length > 500)) throw new HttpError(400, 'Order note is too long.');
  if (body.couponCode && (typeof body.couponCode !== 'string' || body.couponCode.length > 40)) throw new HttpError(400, 'Invalid coupon code.');
  if (!Array.isArray(body.items) || !body.items.length || body.items.length > 30) throw new HttpError(400, 'Your cart must contain 1–30 items.');

  const trackingHash = hashTrackingCode(body.trackingCode);
  const signedIn = await require('../../auth/customer-session').currentCustomer(req).catch(() => null);
  const input = {
    customerHintId: signedIn?.id || null,
    customer: { name: body.customer?.name, phone: body.customer?.phone, email: body.customer?.email },
    address: { line1: body.address?.line1, city: body.address?.city, areaId: body.address?.areaId, area: body.address?.area },
    items: body.items.map((i) => ({ variantId: i.variantId, qty: i.qty })),
    note: body.note, couponCode: body.couponCode, paymentMethod: 'cod', trackingHash,
    source: body.landingPageId ? 'landing_page' : 'website',
    landingPageId: body.landingPageId ? Number(body.landingPageId) : null,
    draftToken: typeof body.draftToken === 'string' && /^[0-9a-f]{64}$/.test(body.draftToken) ? body.draftToken : null,
    ip: req.ip,
  };

  try {
    const result = await withTx(async (conn) => {
      const [[previous]] = await conn.query('SELECT * FROM orders WHERE tracking_token_hash = ? FOR UPDATE', [trackingHash]);
      if (previous) return { replay: true, order: previous };
      const created = await createOrderCore(conn, input, {});
      return { replay: false, order: { order_no: created.order_no, subtotal: created.subtotal, discount: created.discount, delivery_fee: created.delivery_fee, total: created.total, status: created.status, id: created.id } };
    });
    res.status(result.replay ? 200 : 201).json({ ...receipt(result.order), id: undefined, orderId: result.order.id, eventId: `purchase-${result.order.id}` });
    if (!result.replay) {
      try { require('../../services/marketing/capi').queuePurchase(result.order.id, req); } catch { /* optional */ }
    }
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      const [existing] = await pool.query('SELECT * FROM orders WHERE tracking_token_hash = ?', [trackingHash]);
      if (existing[0]) return res.status(200).json(receipt(existing[0]));
    }
    throw error;
  }
});

const trackOrder = asyncRoute(async (req, res) => {
  const orderNo = String(req.body?.orderNo || '').trim().toUpperCase();
  if (!isPublicOrderNumber(orderNo)) throw new HttpError(404, 'Order not found. For an older order, contact support.');
  const [orders] = await pool.query(`
    SELECT id, order_no, created_at, guest_name, guest_phone, status, subtotal, delivery_fee, discount, total
    FROM orders WHERE order_no = ? LIMIT 1`, [orderNo]);
  const order = orders[0];
  if (!order) throw new HttpError(404, 'Order not found. Please check your order number.');
  const [items] = await pool.query('SELECT name, variant_label, qty, line_total FROM order_items WHERE order_id = ? ORDER BY id', [order.id]);
  const [[shipment]] = await pool.query(`
    SELECT p.name AS provider, s.status, s.updated_at FROM courier_shipments s
    JOIN courier_providers p ON p.id = s.provider_id WHERE s.order_id = ? ORDER BY s.id DESC LIMIT 1`, [order.id]);
  res.set('Cache-Control', 'no-store');
  res.json({
    courier: shipment || null, order_no: order.order_no, created_at: order.created_at,
    customer_name_masked: maskCustomerName(order.guest_name), customer_phone_masked: maskCustomerPhone(order.guest_phone),
    status: order.status, status_label: STATUS_LABELS[order.status], subtotal: order.subtotal,
    delivery_fee: order.delivery_fee, discount: order.discount, total: order.total, items,
  });
});

// Incomplete checkout: remember what the visitor typed so staff can follow up.
const saveDraft = asyncRoute(async (req, res) => {
  const b = req.body || {};
  const token = String(b.draftToken || '');
  if (!/^[0-9a-f]{64}$/.test(token)) throw new HttpError(400, 'Invalid draft.');
  const clip = (v, n) => String(v || '').trim().slice(0, n) || null;
  const phone = normalizePhone(b.phone); // may be empty: a half-typed form is still worth following up
  const name = clip(b.name, 120);
  const address = clip(b.address, 255);
  const city = clip(b.city, 120);
  if (!phone && !name && !address && !city) return res.json({ ok: true, saved: false });
  const items = Array.isArray(b.items) ? b.items.slice(0, 30).map((i) => ({ variantId: Number(i.variantId), qty: Number(i.qty), name: String(i.name || '').slice(0, 120) })) : [];
  const origin = b.origin === 'landing' ? 'landing' : 'checkout';
  let landingId = Number(b.landingPageId);
  if (!Number.isInteger(landingId) || landingId < 1) landingId = null;
  const src = b.source && typeof b.source === 'object' ? b.source : {};
  await pool.query(`
    INSERT INTO checkout_drafts (draft_token, name, phone, address_line, city, items_json, subtotal, ip_address,
      landing_page_id, source_url, utm_source, utm_medium, utm_campaign, utm_content, fbclid, origin)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON DUPLICATE KEY UPDATE name = COALESCE(VALUES(name), name), phone = COALESCE(VALUES(phone), phone),
      address_line = COALESCE(VALUES(address_line), address_line), city = COALESCE(VALUES(city), city),
      items_json = VALUES(items_json), subtotal = VALUES(subtotal)`,
  [token, name, phone || null, address, city, JSON.stringify(items), Math.max(0, Number(b.subtotal) || 0), req.ip,
    landingId, clip(b.sourceUrl, 500), clip(src.utm_source, 120), clip(src.utm_medium, 120), clip(src.utm_campaign, 190),
    clip(src.utm_content, 190), clip(src.fbclid, 255), origin]);
  res.json({ ok: true, saved: true });
});

// ------------------------------------------------------------------- admin
function listFilters(query, { includeStatus = true } = {}) {
  const clauses = [];
  const params = [];
  const search = String(query.search ?? query.q ?? '').trim().slice(0, 100);
  const phone = normalizePhone(search);
  if (phone) {
    clauses.push('o.guest_phone IN (?, ?, ?)');
    params.push(phone, `880${phone.slice(1)}`, `+880${phone.slice(1)}`);
  } else if (search) {
    clauses.push('(LOCATE(?, o.order_no) > 0 OR LOCATE(?, o.guest_name) > 0 OR LOCATE(?, o.guest_phone) > 0)');
    params.push(search, search, search);
  }
  const status = String(query.status || 'all');
  if (includeStatus && status !== 'all') {
    if (!STATUSES.includes(status)) throw new HttpError(400, 'Invalid order status filter.');
    clauses.push('o.status = ?'); params.push(status);
  }
  for (const [key, column] of [['source', 'o.source'], ['type', 'o.order_type'], ['payment', 'o.payment_status']]) {
    const value = String(query[key] || 'all');
    if (value !== 'all') { clauses.push(`${column} = ?`); params.push(value); }
  }
  if (query.assigned && query.assigned !== 'all') { clauses.push('o.assigned_admin_id = ?'); params.push(intParam(query.assigned)); }
  const from = dateOnly(query.from, 'From date', { required: false });
  const to = dateOnly(query.to, 'To date', { required: false });
  if (from) { clauses.push('o.created_at >= ?'); params.push(`${from} 00:00:00`); }
  if (to) { clauses.push('o.created_at < DATE_ADD(?, INTERVAL 1 DAY)'); params.push(`${to} 00:00:00`); }
  const courier = String(query.courier || 'all');
  if (courier !== 'all') {
    const active = "s.status IN ('booked','picked_up','in_transit','returning')";
    if (courier === 'unassigned') {
      clauses.push(`NOT EXISTS (SELECT 1 FROM courier_shipments s WHERE s.order_id = o.id AND ${active})`);
    } else if (/^[a-z][a-z0-9-]{1,39}$/.test(courier)) {
      clauses.push(`EXISTS (SELECT 1 FROM courier_shipments s JOIN courier_providers p ON p.id = s.provider_id WHERE s.order_id = o.id AND ${active} AND p.code = ?)`);
      params.push(courier);
    } else throw new HttpError(400, 'Invalid courier filter.');
  }
  return { sql: clauses.length ? `WHERE ${clauses.join(' AND ')}` : '', params };
}

const listOrders = asyncRoute(async (req, res) => {
  const list = paging(req.query, { defaultLimit: 20 });
  if (![10, 20, 50, 100].includes(list.limit)) throw new HttpError(400, 'Rows per page must be 10, 20, 50 or 100.');
  const filtered = listFilters(req.query);
  const scope = listFilters(req.query, { includeStatus: false });

  const [[[count]], [statusRows], [rows], [[draftCount]]] = await Promise.all([
    pool.query(`SELECT COUNT(*) AS total FROM orders o ${filtered.sql}`, filtered.params),
    pool.query(`SELECT o.status, COUNT(*) AS total FROM orders o ${scope.sql} GROUP BY o.status`, scope.params),
    pool.query(`
      SELECT o.id, o.order_no, o.guest_name, o.guest_phone, o.address_line, o.area, o.city, o.created_at, o.status,
             o.payment_status, o.total, o.paid_amount, o.source, o.order_type, o.note, o.parent_order_id,
             cu.username AS created_by,
             (SELECT u.username FROM order_status_history h JOIN admin_users u ON u.id = h.changed_by_admin_id
               WHERE h.order_id = o.id AND h.new_status = 'confirmed' ORDER BY h.id DESC LIMIT 1) AS approved_by,
             (SELECT COUNT(*) FROM orders x WHERE x.guest_phone = o.guest_phone AND x.id < o.id) AS previous_orders,
             (SELECT COUNT(*) FROM order_notes n WHERE n.order_id = o.id) AS note_count,
             (SELECT p.name FROM courier_shipments s JOIN courier_providers p ON p.id = s.provider_id WHERE s.order_id = o.id ORDER BY s.id DESC LIMIT 1) AS courier_name,
             (SELECT s.consignment_id FROM courier_shipments s WHERE s.order_id = o.id ORDER BY s.id DESC LIMIT 1) AS consignment_id,
             EXISTS (SELECT 1 FROM courier_shipments a WHERE a.order_id = o.id AND a.status IN ('booked','picked_up','in_transit')) AS has_active_shipment
      FROM orders o LEFT JOIN admin_users cu ON cu.id = o.created_by_admin_id
      ${filtered.sql} ORDER BY o.id DESC LIMIT ? OFFSET ?`, [...filtered.params, list.limit, list.offset]),
    pool.query("SELECT COUNT(*) AS n FROM checkout_drafts WHERE status = 'open'"),
  ]);

  let items = [];
  if (rows.length) {
    [items] = await pool.query(`
      SELECT oi.order_id, oi.name, oi.variant_label, oi.qty, ${IMAGE_SQL} AS image_url
      FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id
      WHERE oi.order_id IN (${rows.map(() => '?').join(',')}) ORDER BY oi.id`, rows.map((r) => r.id));
  }
  const byOrder = new Map();
  for (const item of items) {
    const arr = byOrder.get(item.order_id) || [];
    arr.push(item); byOrder.set(item.order_id, arr);
  }
  const statusCounts = Object.fromEntries(statusRows.map((r) => [r.status, Number(r.total)]));
  const total = Number(count.total);
  res.set('Cache-Control', 'no-store');
  res.json({
    ...pageResult(rows.map((r) => ({
      ...r, status_label: STATUS_LABELS[r.status], total: Number(r.total), paid_amount: Number(r.paid_amount),
      due: Math.max(0, Number(r.total) - Number(r.paid_amount)), items: byOrder.get(r.id) || [],
    })), total, list),
    hasPreviousPage: list.page > 1, hasNextPage: list.page < Math.max(1, Math.ceil(total / list.limit)),
    statusCounts, allCount: Object.values(statusCounts).reduce((a, b) => a + b, 0), incompleteCount: Number(draftCount.n),
  });
});

async function loadDetail(id) {
  const [[order]] = await pool.query(`
    SELECT o.*, cu.username AS created_by, au.username AS assigned_to, po.order_no AS parent_order_no
    FROM orders o LEFT JOIN admin_users cu ON cu.id = o.created_by_admin_id
    LEFT JOIN admin_users au ON au.id = o.assigned_admin_id LEFT JOIN orders po ON po.id = o.parent_order_id
    WHERE o.id = ?`, [id]);
  if (!order) throw new HttpError(404, 'Order not found.');
  delete order.tracking_token_hash;
  const phones = [order.guest_phone];
  const normalized = normalizePhone(order.guest_phone);
  if (normalized) phones.push(`880${normalized.slice(1)}`, `+880${normalized.slice(1)}`);
  const [[items], [history], [notes], [summary], [previous], [[customer]], [[blocked]]] = await Promise.all([
    pool.query(`SELECT oi.id, oi.product_id, oi.variant_id, oi.name, oi.variant_label, oi.qty, oi.delivered_qty, oi.unit_price, oi.line_total,
                ${IMAGE_SQL} AS image_url, v.sku
                FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id LEFT JOIN product_variants v ON v.id = oi.variant_id
                WHERE oi.order_id = ? ORDER BY oi.id`, [id]),
    pool.query(`SELECT h.old_status, h.new_status, h.created_at, u.username AS changed_by FROM order_status_history h
                LEFT JOIN admin_users u ON u.id = h.changed_by_admin_id WHERE h.order_id = ? ORDER BY h.id`, [id]),
    pool.query(`SELECT n.id, n.kind, n.note, n.created_at, u.username AS admin FROM order_notes n
                LEFT JOIN admin_users u ON u.id = n.admin_id WHERE n.order_id = ? ORDER BY n.id DESC`, [id]),
    pool.query(`SELECT COUNT(*) AS total_orders, COALESCE(SUM(status IN ('delivered','partial_delivered')),0) AS delivered_orders,
                COALESCE(SUM(status = 'cancelled'),0) AS cancelled_orders, COALESCE(SUM(status IN ('returned','return_pending')),0) AS returned_orders
                FROM orders WHERE guest_phone IN (${phones.map(() => '?').join(',')})`, phones),
    pool.query(`SELECT id, order_no, status, total, created_at FROM orders WHERE guest_phone IN (${phones.map(() => '?').join(',')}) ORDER BY id DESC LIMIT 20`, phones),
    pool.query('SELECT id, is_blocked FROM customers WHERE phone = ?', [normalized || order.guest_phone]),
    pool.query("SELECT id FROM blocklist WHERE kind = 'phone' AND value = ?", [normalized || order.guest_phone]),
  ]);
  return {
    order: { ...order, status_label: STATUS_LABELS[order.status], editable: EDITABLE.includes(order.status), due: Math.max(0, Number(order.total) - Number(order.paid_amount)) },
    items, history, notes,
    customerHistory: {
      totalOrders: Number(summary[0]?.total_orders || 0), deliveredOrders: Number(summary[0]?.delivered_orders || 0),
      cancelledOrders: Number(summary[0]?.cancelled_orders || 0), returnedOrders: Number(summary[0]?.returned_orders || 0),
      recentOrders: previous, customerId: customer?.id || null, isBlocked: Boolean(customer?.is_blocked || blocked),
    },
  };
}

const getOrderDetail = asyncRoute(async (req, res) => {
  res.set('Cache-Control', 'no-store');
  res.json(await loadDetail(intParam(req.params.id, 'order ID')));
});

const changeOrderStatus = asyncRoute(async (req, res) => {
  const id = intParam(req.params.id, 'order ID');
  const next = req.body?.status;
  if (typeof next !== 'string' || !STATUSES.includes(next)) throw new HttpError(400, 'Invalid status.');
  const result = await withTx((conn) => changeStatusTx(conn, id, next, {
    adminId: req.adminUser.id, reason: req.body.reason, items: req.body.items, collectedAmount: req.body.collectedAmount,
  }));
  if (next === 'confirmed' || next === 'delivered') { try { require('../../services/marketing/capi').queueStatusEvent(id, next); } catch { /* optional */ } }
  res.json({ ok: true, status: result.status });
});

const updateOrder = asyncRoute(async (req, res) => {
  const id = intParam(req.params.id, 'order ID');
  await editOrder(id, req.body || {}, req.adminUser.id);
  res.json(await loadDetail(id));
});

const addNote = asyncRoute(async (req, res) => {
  const id = intParam(req.params.id, 'order ID');
  const kind = ['internal', 'courier', 'customer'].includes(req.body?.kind) ? req.body.kind : 'internal';
  const note = String(req.body?.note || '').trim();
  if (!note || note.length > 1000) throw new HttpError(400, 'Enter a note of up to 1000 characters.');
  const [[order]] = await pool.query('SELECT id FROM orders WHERE id = ?', [id]);
  if (!order) throw new HttpError(404, 'Order not found.');
  await pool.query('INSERT INTO order_notes (order_id, kind, note, admin_id) VALUES (?,?,?,?)', [id, kind, note, req.adminUser.id]);
  res.status(201).json({ ok: true });
});

const assignOrder = asyncRoute(async (req, res) => {
  const id = intParam(req.params.id, 'order ID');
  const adminId = req.body?.adminId ? intParam(req.body.adminId, 'admin') : null;
  await pool.query('UPDATE orders SET assigned_admin_id = ? WHERE id = ?', [adminId, id]);
  res.json({ ok: true });
});

const createManualOrder = asyncRoute(async (req, res) => {
  const b = req.body || {};
  const result = await withTx((conn) => createOrderCore(conn, {
    customer: b.customer || {}, address: b.address || {}, items: b.items || [], note: b.note, couponCode: b.couponCode,
    discountOverride: b.discount, deliveryOverride: b.deliveryFee, source: b.source || 'phone', orderType: 'manual',
    paymentMethod: 'cod', initialNote: b.internalNote, draftToken: b.draftToken, status: b.autoConfirm ? 'placed' : 'placed',
  }, { adminId: req.adminUser.id }));
  if (b.autoConfirm) await withTx((conn) => changeStatusTx(conn, result.id, 'confirmed', { adminId: req.adminUser.id }));
  await audit(req.adminUser.id, 'create', 'order', result.id, 'manual order');
  res.status(201).json({ id: result.id, order_no: result.order_no, total: result.total });
});

const createExchangeOrder = asyncRoute(async (req, res) => {
  const b = req.body || {};
  const parentId = intParam(b.parentOrderId, 'original order');
  const result = await withTx(async (conn) => {
    const [[parent]] = await conn.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [parentId]);
    if (!parent) throw new HttpError(404, 'Original order not found.');
    if (!['delivered', 'partial_delivered'].includes(parent.status)) throw new HttpError(409, 'Only delivered orders can be exchanged.');
    const returned = Array.isArray(b.returnItems) ? b.returnItems : [];
    if (!returned.length) throw new HttpError(400, 'Select at least one item being returned.');
    let returnValue = 0;
    const restock = [];
    for (const r of returned) {
      const [[line]] = await conn.query('SELECT * FROM order_items WHERE id = ? AND order_id = ?', [Number(r.orderItemId), parentId]);
      const qty = Number(r.qty);
      if (!line || !Number.isInteger(qty) || qty < 1 || qty > Number(line.delivered_qty ?? line.qty)) throw new HttpError(400, 'A return quantity is invalid.');
      returnValue += Number(line.unit_price) * qty;
      restock.push({ variantId: line.variant_id, qty });
    }
    const created = await createOrderCore(conn, {
      customer: { name: parent.guest_name, phone: parent.guest_phone, email: parent.guest_email },
      address: { line1: parent.address_line, city: parent.city, areaId: parent.area_id },
      items: b.newItems || [], note: b.note, source: parent.source, orderType: 'exchange', parentOrderId: parentId,
      deliveryOverride: b.deliveryFee ?? 0, discountOverride: Math.min(returnValue, Number(b.creditApplied ?? returnValue)),
      initialNote: `Exchange for ${parent.order_no}`,
    }, { adminId: req.adminUser.id });
    if (b.restockReturned !== false) {
      await applyLines(conn, restock, +1, { type: 'return_restock', refType: 'order', refId: created.id, adminId: req.adminUser.id, note: `Exchange return from ${parent.order_no}` });
    }
    await conn.query("INSERT INTO order_notes (order_id, kind, note, admin_id) VALUES (?, 'internal', ?, ?)",
      [parentId, `Exchange order ${created.order_no} created (credit ৳${returnValue.toFixed(2)}).`, req.adminUser.id]);
    return created;
  });
  res.status(201).json({ id: result.id, order_no: result.order_no, total: result.total });
});

const bulkAction = asyncRoute(async (req, res) => {
  const ids = Array.isArray(req.body?.ids) ? [...new Set(req.body.ids.map(Number))].filter((n) => Number.isSafeInteger(n) && n > 0) : [];
  if (!ids.length || ids.length > 200) throw new HttpError(400, 'Select 1–200 orders.');
  const action = req.body?.action;
  const results = [];
  if (action === 'status') {
    const next = req.body.status;
    if (!STATUSES.includes(next)) throw new HttpError(400, 'Invalid status.');
    for (const id of ids) {
      try {
        await withTx((conn) => changeStatusTx(conn, id, next, { adminId: req.adminUser.id, reason: req.body.reason }));
        results.push({ id, ok: true });
      } catch (error) {
        if (!(error instanceof HttpError)) throw error;
        results.push({ id, ok: false, error: error.message });
      }
    }
  } else if (action === 'assign') {
    const adminId = req.body.adminId ? intParam(req.body.adminId, 'admin') : null;
    await pool.query(`UPDATE orders SET assigned_admin_id = ? WHERE id IN (${ids.map(() => '?').join(',')})`, [adminId, ...ids]);
    ids.forEach((id) => results.push({ id, ok: true }));
  } else if (action === 'source') {
    const source = String(req.body.source || '').slice(0, 40);
    if (!source) throw new HttpError(400, 'Choose a source.');
    await pool.query(`UPDATE orders SET source = ? WHERE id IN (${ids.map(() => '?').join(',')})`, [source, ...ids]);
    ids.forEach((id) => results.push({ id, ok: true }));
  } else throw new HttpError(400, 'Unknown bulk action.');
  await audit(req.adminUser.id, `bulk_${action}`, 'order', ids.length, `${results.filter((r) => r.ok).length}/${ids.length} ok`);
  res.json({ results, okCount: results.filter((r) => r.ok).length, failCount: results.filter((r) => !r.ok).length });
});

const invoices = asyncRoute(async (req, res) => {
  const ids = String(req.query.ids || '').split(',').map(Number).filter((n) => Number.isSafeInteger(n) && n > 0).slice(0, 100);
  if (!ids.length) throw new HttpError(400, 'Select at least one order.');
  const out = [];
  for (const id of ids) out.push(await loadDetail(id));
  await pool.query(`UPDATE orders SET invoice_printed_at = NOW() WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
  const [rows] = await pool.query("SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN ('site_name','logo_url','invoice_address','invoice_footer','contact_phone','contact_email')");
  res.json({ invoices: out, settings: Object.fromEntries(rows.map((r) => [r.setting_key, r.setting_value])) });
});

const listDrafts = asyncRoute(async (req, res) => {
  const list = paging(req.query);
  const status = ['open', 'converted', 'dismissed'].includes(req.query.status) ? req.query.status : 'open';
  const [[count]] = await pool.query('SELECT COUNT(*) AS n FROM checkout_drafts WHERE status = ?', [status]);
  const [rows] = await pool.query('SELECT d.id, d.draft_token, d.name, d.phone, d.address_line, d.city, d.items_json, d.subtotal, d.status, d.order_id, d.created_at, d.updated_at, d.origin, d.source_url, d.utm_source, d.utm_medium, d.utm_campaign, d.utm_content, d.fbclid, d.landing_page_id, lp.title AS landing_title, lp.slug AS landing_slug FROM checkout_drafts d LEFT JOIN landing_pages lp ON lp.id = d.landing_page_id WHERE d.status = ? ORDER BY d.updated_at DESC LIMIT ? OFFSET ?', [status, list.limit, list.offset]);
  res.json(pageResult(rows.map((r) => ({ ...r, items: typeof r.items_json === 'string' ? JSON.parse(r.items_json) : (r.items_json || []), items_json: undefined })), Number(count.n), list));
});

const dismissDraft = asyncRoute(async (req, res) => {
  await pool.query("UPDATE checkout_drafts SET status = 'dismissed' WHERE id = ? AND status = 'open'", [intParam(req.params.id)]);
  res.json({ ok: true });
});

// Order Processing Report: how many orders each staff member moved through each stage.
const processingReport = asyncRoute(async (req, res) => {
  const from = dateOnly(req.query.from, 'From date', { required: false }) || daysAgo(29);
  const to = dateOnly(req.query.to, 'To date', { required: false }) || today();
  const [rows] = await pool.query(`
    SELECT COALESCE(u.name, 'System / customer') AS staff, h.new_status, COUNT(*) AS total
    FROM order_status_history h LEFT JOIN admin_users u ON u.id = h.changed_by_admin_id
    WHERE h.created_at >= ? AND h.created_at < DATE_ADD(?, INTERVAL 1 DAY)
    GROUP BY staff, h.new_status ORDER BY staff`, [`${from} 00:00:00`, `${to} 00:00:00`]);
  const staff = new Map();
  for (const r of rows) {
    const entry = staff.get(r.staff) || { staff: r.staff, total: 0 };
    entry[r.new_status] = Number(r.total); entry.total += Number(r.total); staff.set(r.staff, entry);
  }
  const [daily] = await pool.query(`
    SELECT DATE(created_at) AS day, COUNT(*) AS orders, COALESCE(SUM(total),0) AS value
    FROM orders WHERE created_at >= ? AND created_at < DATE_ADD(?, INTERVAL 1 DAY) GROUP BY DATE(created_at) ORDER BY day`, [`${from} 00:00:00`, `${to} 00:00:00`]);
  res.json({ from, to, staff: [...staff.values()], daily: daily.map((d) => ({ day: d.day, orders: Number(d.orders), value: Number(d.value) })), statuses: STATUS_LABELS });
});

const orderMeta = asyncRoute(async (_req, res) => {
  const [[sources], [presets], [admins]] = await Promise.all([
    pool.query('SELECT code, name FROM order_sources WHERE is_active = 1 ORDER BY sort_order, id'),
    pool.query('SELECT id, kind, text FROM note_presets WHERE is_active = 1 ORDER BY sort_order, id'),
    pool.query('SELECT id, username, name FROM admin_users WHERE is_active = 1 ORDER BY name'),
  ]);
  res.json({ statuses: STATUS_LABELS, sources, presets, admins, editable: EDITABLE });
});

module.exports = {
  OrderError, createOrder, trackOrder, saveDraft, listOrders, getOrderDetail, changeOrderStatus, updateOrder, addNote,
  assignOrder, createManualOrder, createExchangeOrder, bulkAction, invoices, listDrafts, dismissDraft, processingReport, orderMeta,
};
