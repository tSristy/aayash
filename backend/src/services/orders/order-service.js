'use strict';

const { HttpError, withTx, audit } = require('../../lib/http');
const { applyLines } = require('../inventory/stock');
const { addTransaction, defaultAccountId } = require('../accounts/ledger');
const { createPublicOrderNumber } = require('./order-number');
const { normalizePhone } = require('./order-policy');
const { canMove, EDITABLE } = require('./workflow');

const cents = (v) => Math.round(Number(v) * 100);

/** Delivery fee comes from the database: city override > zone charge. Area may override. */
async function resolveShipping(conn, cityName, areaId) {
  const [[city]] = await conn.query(`
    SELECT c.id, c.name, c.zone_id, c.charge_override, z.charge AS zone_charge
    FROM delivery_cities c JOIN delivery_zones z ON z.id = c.zone_id
    WHERE c.name = ? AND c.is_active = 1 AND z.is_active = 1`, [String(cityName || '')]);
  if (!city) throw new HttpError(400, 'Select a supported delivery city.');
  let charge = city.charge_override != null ? Number(city.charge_override) : Number(city.zone_charge);
  let area = null;
  if (areaId) {
    const [[row]] = await conn.query('SELECT id, name, charge_override FROM delivery_areas WHERE id = ? AND city_id = ? AND is_active = 1', [areaId, city.id]);
    if (!row) throw new HttpError(400, 'Select a valid delivery area.');
    area = row;
    if (row.charge_override != null) charge = Number(row.charge_override);
  }
  return { cityId: city.id, cityName: city.name, zoneId: city.zone_id, areaId: area?.id || null, areaName: area?.name || null, charge };
}

async function setting(conn, key) {
  const [[row]] = await conn.query('SELECT setting_value FROM site_settings WHERE setting_key = ?', [key]);
  return row?.setting_value ?? null;
}

async function checkBlocked(conn, phone, ip) {
  const [rows] = await conn.query(
    "SELECT id FROM blocklist WHERE (kind = 'phone' AND value = ?) OR (kind = 'ip' AND value = ?) LIMIT 1", [phone, ip || '']);
  const [[customer]] = await conn.query('SELECT is_blocked FROM customers WHERE phone = ?', [phone]);
  if (rows.length || customer?.is_blocked) {
    throw new HttpError(403, 'We are unable to accept this order. Please contact support.');
  }
}

async function upsertCustomer(conn, { name, phone, email, address, city, hintId }) {
  // A signed-in social-login customer has a placeholder phone; their first order gives it a real number.
  if (hintId) {
    const [[hint]] = await conn.query('SELECT id, phone FROM customers WHERE id = ? FOR UPDATE', [hintId]);
    const [[taken]] = await conn.query('SELECT id FROM customers WHERE phone = ?', [phone]);
    if (hint && (hint.phone === phone || (!taken && /:/.test(hint.phone)))) {
      await conn.query('UPDATE customers SET phone = ?, address = COALESCE(?, address), city = COALESCE(?, city) WHERE id = ?', [phone, address || null, city || null, hint.id]);
      return hint.id;
    }
  }
  let safeEmail = email || null;
  if (safeEmail) {
    const [[clash]] = await conn.query('SELECT id FROM customers WHERE email = ? AND phone <> ?', [safeEmail, phone]);
    if (clash) safeEmail = null;
  }
  // Single-statement upsert: a SELECT ... FOR UPDATE on a missing row takes gap locks that deadlock concurrent checkouts.
  const [result] = await conn.query(`
    INSERT INTO customers (name, phone, email, address, city) VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE address = COALESCE(VALUES(address), address), city = COALESCE(VALUES(city), city), id = LAST_INSERT_ID(id)`,
  [name, phone, safeEmail, address || null, city || null]);
  return result.insertId;
}

/**
 * Create an order inside the caller's transaction. Used by checkout, admin
 * manual orders, POS, exchanges and landing pages so stock, coupons, shipping
 * and accounting follow one set of rules.
 */
async function createOrderCore(conn, input, ctx = {}) {
  const orderType = input.orderType || 'online';
  const isPos = orderType === 'pos';
  const walkIn = isPos && !String(input.customer?.phone || '').trim();
  const phone = walkIn ? 'WALKIN' : normalizePhone(input.customer?.phone);
  const name = walkIn ? (String(input.customer?.name || '').trim() || 'Walk-in customer') : String(input.customer?.name || '').trim();

  if (!name || name.length > 120) throw new HttpError(400, 'A valid customer name is required.');
  if (!phone) throw new HttpError(400, 'Enter a valid Bangladesh mobile number.');
  if (!Array.isArray(input.items) || !input.items.length || input.items.length > 60) throw new HttpError(400, 'Add 1–60 items.');

  if (!ctx.adminId && !walkIn) await checkBlocked(conn, phone, input.ip);

  let shipping = { cityId: null, cityName: input.address?.city || 'POS', zoneId: null, areaId: null, areaName: null, charge: 0 };
  const line1 = String(input.address?.line1 || '').trim();
  if (!isPos) {
    if (!line1 || line1.length > 255) throw new HttpError(400, 'A valid delivery address is required.');
    shipping = await resolveShipping(conn, input.address?.city, input.address?.areaId ? Number(input.address.areaId) : null);
  }

  const wanted = new Map();
  for (const item of input.items) {
    const variantId = Number(item.variantId);
    const qty = Number(item.qty);
    if (!Number.isSafeInteger(variantId) || variantId < 1 || !Number.isInteger(qty) || qty < 1 || qty > 1000) {
      throw new HttpError(400, 'An item quantity or variant is invalid.');
    }
    const entry = wanted.get(variantId) || { qty: 0, price: null };
    entry.qty += qty;
    if (item.unitPrice !== undefined && item.unitPrice !== null && item.unitPrice !== '' && ctx.adminId) {
      const p = Number(item.unitPrice);
      if (!Number.isFinite(p) || p < 0) throw new HttpError(400, 'An item price is invalid.');
      entry.price = p;
    }
    if (!ctx.adminId && entry.qty > 20) throw new HttpError(400, 'Maximum quantity per variant is 20.');
    wanted.set(variantId, entry);
  }

  const lines = [];
  let anyFreeDelivery = false;
  for (const id of [...wanted.keys()].sort((a, b) => a - b)) {
    const [[variant]] = await conn.query(`
      SELECT v.id, v.label, v.price, v.stock, v.cost_price, p.id AS product_id, p.name, p.is_combo, p.is_free_delivery
      FROM product_variants v JOIN products p ON p.id = v.product_id
      WHERE v.id = ? AND p.is_active = 1 AND p.status = 'active' FOR UPDATE`, [id]);
    if (!variant) throw new HttpError(400, 'A product in your cart is unavailable.');
    const entry = wanted.get(id);
    if (variant.stock < entry.qty) {
      throw new HttpError(409, `Only ${variant.stock} left of ${variant.name} (${variant.label}).`);
    }
    let unitCost = Number(variant.cost_price);
    if (variant.is_combo) {
      const [[sum]] = await conn.query(`
        SELECT COALESCE(SUM(ci.qty * cv.cost_price), 0) AS cost FROM combo_items ci
        JOIN product_variants cv ON cv.id = ci.variant_id WHERE ci.combo_product_id = ?`, [variant.product_id]);
      unitCost = Number(sum.cost);
    }
    if (variant.is_free_delivery) anyFreeDelivery = true;
    const priceCents = entry.price != null ? cents(entry.price) : cents(variant.price);
    lines.push({ ...variant, qty: entry.qty, priceCents, unitCost, lineTotalCents: priceCents * entry.qty });
  }

  // Free gifts: a combo set to "with_main" gives its gift products at 0 with every order of its main product.
  if (!isPos) {
    const reserved = new Map(lines.map((l) => [l.id, l.qty]));
    const gifts = [];
    for (const line of lines.filter((l) => !l.is_combo)) {
      const [rules] = await conn.query(`
        SELECT mi.qty AS main_qty, gi.variant_id AS gift_variant_id, gi.qty AS gift_qty
        FROM combo_items mi
        JOIN products cp ON cp.id = mi.combo_product_id AND cp.is_combo = 1 AND cp.is_active = 1
          AND cp.status = 'active' AND cp.gift_mode = 'with_main'
        JOIN combo_items gi ON gi.combo_product_id = cp.id AND gi.role = 'gift'
        WHERE mi.role = 'main' AND mi.variant_id = ?`, [line.id]);
      for (const rule of rules) {
        const sets = Math.floor(line.qty / Math.max(1, Number(rule.main_qty)));
        const want = sets * Number(rule.gift_qty);
        if (want < 1) continue;
        const [[gv]] = await conn.query(`
          SELECT v.id, v.label, v.stock, v.cost_price, p.id AS product_id, p.name
          FROM product_variants v JOIN products p ON p.id = v.product_id
          WHERE v.id = ? AND p.is_active = 1 AND p.status = 'active' AND p.is_combo = 0 FOR UPDATE`, [rule.gift_variant_id]);
        if (!gv || Number(gv.stock) - (reserved.get(gv.id) || 0) < want) continue; // gift out of stock: skip, never block the order
        reserved.set(gv.id, (reserved.get(gv.id) || 0) + want);
        gifts.push({ id: gv.id, label: `${gv.label} · free gift`, product_id: gv.product_id, name: gv.name, is_combo: 0, qty: want, priceCents: 0, unitCost: Number(gv.cost_price), lineTotalCents: 0, isGift: true });
      }
    }
    lines.push(...gifts);
  }

  const subtotalCents = lines.reduce((s, l) => s + l.lineTotalCents, 0);
  let discountCents = 0;
  let coupon = null;
  if (input.couponCode) {
    const [[found]] = await conn.query(
      'SELECT * FROM coupons WHERE code = ? AND is_active = 1 AND (expires_at IS NULL OR expires_at > NOW())',
      [String(input.couponCode).trim()]);
    if (!found || subtotalCents < cents(found.min_order)) throw new HttpError(400, 'The coupon is invalid for this order.');
    coupon = found;
    const proposed = found.discount_type === 'percent'
      ? Math.round(subtotalCents * Number(found.discount_value) / 100)
      : cents(found.discount_value);
    discountCents = Math.min(subtotalCents, Math.max(0, proposed));
  }
  if (ctx.adminId && input.discountOverride != null && input.discountOverride !== '') {
    discountCents = Math.min(subtotalCents, Math.max(0, cents(input.discountOverride)));
  }

  let deliveryCents = cents(shipping.charge);
  const freeMin = Number(await setting(conn, 'free_delivery_min_order'));
  if (anyFreeDelivery || (freeMin > 0 && subtotalCents >= cents(freeMin))) deliveryCents = 0;
  if (ctx.adminId && input.deliveryOverride != null && input.deliveryOverride !== '') {
    deliveryCents = Math.max(0, cents(input.deliveryOverride));
  }
  if (isPos) deliveryCents = 0;

  const totalCents = subtotalCents - discountCents + deliveryCents;
  const customerId = walkIn ? null : await upsertCustomer(conn, {
    name, phone, email: input.customer?.email, address: line1 || null, city: isPos ? null : shipping.cityName, hintId: input.customerHintId || null,
  });

  let status = input.status || 'placed';
  let paymentStatus = 'pending';
  let paidAmount = 0;
  if (isPos) {
    status = 'delivered';
    paidAmount = Math.min(totalCents, Math.max(0, cents(input.paidAmount ?? totalCents))) / 100;
    paymentStatus = cents(paidAmount) >= totalCents ? 'paid' : 'pending';
  }

  const orderNo = createPublicOrderNumber();
  const [created] = await conn.query(`
    INSERT INTO orders (
      order_no, customer_id, guest_name, guest_phone, guest_email, address_line, area, city,
      zone_id, city_id, area_id, note, payment_method, payment_status, status, subtotal, delivery_fee,
      discount, total, coupon_id, tracking_token_hash, stock_accounting_version,
      order_type, source, paid_amount, collected_amount, account_id, parent_order_id, landing_page_id,
      created_by_admin_id, ip_address
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,2,?,?,?,?,?,?,?,?,?)`,
  [
    orderNo, customerId, name, phone, input.customer?.email || null,
    isPos ? 'POS sale' : line1, shipping.areaName || (typeof input.address?.area === 'string' ? input.address.area.trim().slice(0, 120) : null) || null,
    shipping.cityName, shipping.zoneId, shipping.cityId, shipping.areaId,
    input.note ? String(input.note).trim().slice(0, 500) : null,
    input.paymentMethod || 'cod', paymentStatus, status,
    subtotalCents / 100, deliveryCents / 100, discountCents / 100, totalCents / 100,
    coupon?.id || null, input.trackingHash || null,
    orderType, input.source || (isPos ? 'pos' : 'website'), paidAmount, isPos ? paidAmount : null,
    input.accountId || null, input.parentOrderId || null, input.landingPageId || null,
    ctx.adminId || null, input.ip || null,
  ]);
  const orderId = created.insertId;

  await conn.query('INSERT INTO order_status_history (order_id, old_status, new_status, changed_by_admin_id) VALUES (?, NULL, ?, ?)',
    [orderId, status, ctx.adminId || null]);

  for (const line of lines) {
    await conn.query(`
      INSERT INTO order_items (order_id, product_id, variant_id, name, variant_label, unit_price, qty, line_total, unit_cost, is_combo)
      VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [orderId, line.product_id, line.id, line.name, line.label, line.priceCents / 100, line.qty, line.lineTotalCents / 100, line.unitCost, line.is_combo ? 1 : 0]);
  }
  await applyLines(conn, lines.map((l) => ({ variantId: l.id, qty: l.qty })), -1, {
    type: isPos ? 'pos_sale' : 'sale', refType: 'order', refId: orderId, adminId: ctx.adminId || null,
  });

  if (isPos) {
    for (const line of lines) {
      await conn.query('UPDATE products SET sold_count = sold_count + ? WHERE id = ?', [line.qty, line.product_id]);
    }
    if (paidAmount > 0) {
      const accountId = input.accountId || await defaultAccountId(conn);
      if (accountId) {
        await addTransaction(conn, {
          accountId, kind: 'income', amount: paidAmount, purposeName: 'Sales',
          note: `POS sale ${orderNo}`, refType: 'order', refId: orderId, adminId: ctx.adminId,
        });
      }
    }
  }

  if (input.initialNote && ctx.adminId) {
    await conn.query("INSERT INTO order_notes (order_id, kind, note, admin_id) VALUES (?, 'internal', ?, ?)",
      [orderId, String(input.initialNote).slice(0, 1000), ctx.adminId]);
  }
  if (input.draftToken) {
    await conn.query("UPDATE checkout_drafts SET status = 'converted', order_id = ? WHERE draft_token = ? AND status = 'open'", [orderId, input.draftToken]);
  }

  return {
    id: orderId, order_no: orderNo, status, subtotal: subtotalCents / 100,
    discount: discountCents / 100, delivery_fee: deliveryCents / 100, total: totalCents / 100,
    lines, customerId,
  };
}

async function recordCollection(conn, order, amount, adminId) {
  const [[already]] = await conn.query("SELECT id FROM transactions WHERE ref_type IN ('order_collect','order') AND ref_id = ? AND kind = 'income' LIMIT 1", [order.id]);
  if (already || !(amount > 0)) return;
  const accountId = order.account_id || await defaultAccountId(conn);
  if (!accountId) return;
  await addTransaction(conn, {
    accountId, kind: 'income', amount, purposeName: 'Sales',
    note: `Order ${order.order_no} collected`, refType: 'order_collect', refId: order.id, adminId,
  });
}

/**
 * Move an order to a new status and apply every side effect (stock, sold
 * counts, payments, ledger) in one transaction.
 * opts: { adminId, reason, items: [{id, delivered_qty}], collectedAmount, force }
 */
async function changeStatusTx(conn, orderId, next, opts = {}) {
  const [[order]] = await conn.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [orderId]);
  if (!order) throw new HttpError(404, 'Order not found.');
  if (order.status === next) return { id: orderId, status: next, unchanged: true };
  if (!canMove(order.status, next)) {
    throw new HttpError(409, `Cannot move order from ${order.status} to ${next}.`);
  }

  const [items] = await conn.query('SELECT id, variant_id, product_id, qty, delivered_qty FROM order_items WHERE order_id = ? ORDER BY variant_id', [orderId]);
  const [[passed]] = await conn.query("SELECT COUNT(*) AS n FROM order_status_history WHERE order_id = ? AND new_status IN ('delivered','partial_delivered')", [orderId]);
  const wasDelivered = Number(passed.n) > 0;
  const meta = (type) => ({ type, refType: 'order', refId: orderId, adminId: opts.adminId || null });
  const v2 = Number(order.stock_accounting_version) === 2;

  if (next === 'out_for_delivery') {
    const [bookings] = await conn.query("SELECT id FROM courier_shipments WHERE order_id = ? AND status IN ('booked','picked_up','in_transit') LIMIT 1", [orderId]);
    if (!bookings.length) throw new HttpError(409, 'Record an active courier shipment before marking Shipment (Out for Delivery).');
  }

  if (next === 'cancelled') {
    const [active] = await conn.query("SELECT id FROM courier_shipments WHERE order_id = ? AND status IN ('booked','picked_up','in_transit','returning') LIMIT 1", [orderId]);
    if (active.length) throw new HttpError(409, 'Cancel the active courier shipment first, after confirming with the courier.');
    await applyLines(conn, items.map((i) => ({ variantId: i.variant_id, qty: i.qty })), +1, meta('cancel_restock'));
    if (!v2) {
      for (const i of items) await conn.query('UPDATE products SET sold_count = GREATEST(0, sold_count - ?) WHERE id = ?', [i.qty, i.product_id]);
    }
    if (opts.reason) {
      await conn.query("INSERT INTO order_notes (order_id, kind, note, admin_id) VALUES (?, 'internal', ?, ?)",
        [orderId, `Cancelled: ${String(opts.reason).slice(0, 900)}`, opts.adminId || null]);
      await conn.query('UPDATE orders SET cancel_reason = ? WHERE id = ?', [String(opts.reason).slice(0, 255), orderId]);
    }
  }

  if (next === 'delivered') {
    // Delivered straight from out_for_delivery, or accepted again after a pending return.
    if (order.status !== 'return_pending' || !wasDelivered) {
      if (v2) for (const i of items) await conn.query('UPDATE products SET sold_count = sold_count + ? WHERE id = ?', [i.qty, i.product_id]);
    }
    const collect = Number(order.total);
    await conn.query("UPDATE orders SET payment_status = 'paid', paid_amount = ?, collected_amount = ? WHERE id = ?", [collect, collect, orderId]);
    await conn.query('UPDATE order_items SET delivered_qty = qty WHERE order_id = ?', [orderId]);
    await recordCollection(conn, order, collect, opts.adminId);
  }

  if (next === 'partial_delivered') {
    const wantedQty = new Map((opts.items || []).map((i) => [Number(i.id), Number(i.delivered_qty)]));
    if (!wantedQty.size) throw new HttpError(400, 'Enter the delivered quantity for each item.');
    const restock = [];
    let deliveredSubtotal = 0;
    let any = false;
    for (const item of items) {
      const got = wantedQty.has(item.id) ? wantedQty.get(item.id) : item.qty;
      if (!Number.isInteger(got) || got < 0 || got > item.qty) throw new HttpError(400, 'A delivered quantity is invalid.');
      const [[price]] = await conn.query('SELECT unit_price FROM order_items WHERE id = ?', [item.id]);
      deliveredSubtotal += Number(price.unit_price) * got;
      if (got > 0) any = true;
      await conn.query('UPDATE order_items SET delivered_qty = ? WHERE id = ?', [got, item.id]);
      if (got < item.qty) restock.push({ variantId: item.variant_id, qty: item.qty - got });
      if (v2 && got > 0) await conn.query('UPDATE products SET sold_count = sold_count + ? WHERE id = ?', [got, item.product_id]);
    }
    if (!any) throw new HttpError(400, 'At least one item must be delivered. Use Return Pending if nothing was delivered.');
    if (restock.length) await applyLines(conn, restock, +1, meta('return_restock'));
    const computed = Math.max(0, deliveredSubtotal - Number(order.discount) + Number(order.delivery_fee));
    const collect = opts.collectedAmount != null && opts.collectedAmount !== '' ? Math.max(0, Number(opts.collectedAmount)) : computed;
    await conn.query("UPDATE orders SET paid_amount = ?, collected_amount = ?, payment_status = 'paid' WHERE id = ?", [collect, collect, orderId]);
    await recordCollection(conn, order, collect, opts.adminId);
  }

  if (next === 'returned') {
    const toRestock = items
      .map((i) => ({ variantId: i.variant_id, qty: i.delivered_qty ?? i.qty, productId: i.product_id }))
      .filter((i) => i.qty > 0);
    if (toRestock.length) await applyLines(conn, toRestock, +1, meta('return_restock'));
    if (v2 && wasDelivered) {
      for (const i of toRestock) await conn.query('UPDATE products SET sold_count = GREATEST(0, sold_count - ?) WHERE id = ?', [i.qty, i.productId]);
    }
    await conn.query('UPDATE order_items SET delivered_qty = 0 WHERE order_id = ?', [orderId]);
    const [[collected]] = await conn.query("SELECT amount, account_id FROM transactions WHERE ref_type IN ('order_collect','order') AND ref_id = ? AND kind = 'income' LIMIT 1", [orderId]);
    if (collected) {
      await addTransaction(conn, {
        accountId: collected.account_id, kind: 'expense', amount: collected.amount, purposeName: 'Sales return',
        note: `Order ${order.order_no} returned`, refType: 'order_return', refId: orderId, adminId: opts.adminId,
      });
      await conn.query("UPDATE orders SET payment_status = 'refunded' WHERE id = ?", [orderId]);
    }
  }

  await conn.query('UPDATE orders SET status = ? WHERE id = ?', [next, orderId]);
  await conn.query('INSERT INTO order_status_history (order_id, old_status, new_status, changed_by_admin_id) VALUES (?, ?, ?, ?)',
    [orderId, order.status, next, opts.adminId || null]);
  return { id: orderId, status: next, from: order.status, order };
}

const changeStatus = (orderId, next, opts) => withTx((conn) => changeStatusTx(conn, orderId, next, opts));

/** Edit customer, address, charges and items of an order that has not shipped. */
async function editOrder(orderId, body, adminId) {
  return withTx(async (conn) => {
    const [[order]] = await conn.query('SELECT * FROM orders WHERE id = ? FOR UPDATE', [orderId]);
    if (!order) throw new HttpError(404, 'Order not found.');
    if (!EDITABLE.includes(order.status)) throw new HttpError(409, 'This order can no longer be edited.');

    const sets = [];
    const params = [];
    const put = (col, val) => { sets.push(`${col} = ?`); params.push(val); };

    if (body.customer) {
      const phone = normalizePhone(body.customer.phone ?? order.guest_phone);
      if (!phone) throw new HttpError(400, 'Enter a valid Bangladesh mobile number.');
      const name = String(body.customer.name ?? order.guest_name).trim();
      if (!name) throw new HttpError(400, 'A valid customer name is required.');
      put('guest_name', name.slice(0, 120));
      put('guest_phone', phone);
      put('guest_email', body.customer.email ? String(body.customer.email).slice(0, 190) : null);
    }
    let shipping = null;
    if (body.address) {
      const line1 = String(body.address.line1 ?? order.address_line).trim();
      if (!line1) throw new HttpError(400, 'A valid delivery address is required.');
      shipping = await resolveShipping(conn, body.address.city ?? order.city, body.address.areaId ? Number(body.address.areaId) : null);
      put('address_line', line1.slice(0, 255));
      put('city', shipping.cityName);
      put('city_id', shipping.cityId);
      put('zone_id', shipping.zoneId);
      put('area_id', shipping.areaId);
      put('area', shipping.areaName || (body.address.area ? String(body.address.area).slice(0, 120) : null));
    }

    let subtotal = Number(order.subtotal);
    if (Array.isArray(body.items)) {
      if (!body.items.length || body.items.length > 60) throw new HttpError(400, 'Add 1–60 items.');
      const [oldItems] = await conn.query('SELECT variant_id, qty FROM order_items WHERE order_id = ? ORDER BY variant_id', [orderId]);
      await applyLines(conn, oldItems.map((i) => ({ variantId: i.variant_id, qty: i.qty })), +1,
        { type: 'adjustment', refType: 'order', refId: orderId, adminId, note: 'Order edited: items released' });
      await conn.query('DELETE FROM order_items WHERE order_id = ?', [orderId]);
      const merged = new Map();
      for (const raw of body.items) {
        const variantId = Number(raw.variantId);
        const qty = Number(raw.qty);
        if (!Number.isSafeInteger(variantId) || !Number.isInteger(qty) || qty < 1) throw new HttpError(400, 'An item is invalid.');
        const entry = merged.get(variantId) || { qty: 0, price: null };
        entry.qty += qty;
        if (raw.unitPrice !== undefined && raw.unitPrice !== null && raw.unitPrice !== '') entry.price = Number(raw.unitPrice);
        merged.set(variantId, entry);
      }
      let sum = 0;
      for (const variantId of [...merged.keys()].sort((a, b) => a - b)) {
        const { qty, price } = merged.get(variantId);
        const [[v]] = await conn.query(`
          SELECT v.id, v.label, v.price, v.stock, v.cost_price, p.id AS product_id, p.name, p.is_combo
          FROM product_variants v JOIN products p ON p.id = v.product_id WHERE v.id = ? FOR UPDATE`, [variantId]);
        if (!v) throw new HttpError(400, 'A product is unavailable.');
        if (v.stock < qty) throw new HttpError(409, `Only ${v.stock} left of ${v.name} (${v.label}).`);
        const unit = price != null && Number.isFinite(price) && price >= 0 ? price : Number(v.price);
        sum += Math.round(unit * 100) * qty;
        await conn.query(`INSERT INTO order_items (order_id, product_id, variant_id, name, variant_label, unit_price, qty, line_total, unit_cost, is_combo)
          VALUES (?,?,?,?,?,?,?,?,?,?)`, [orderId, v.product_id, v.id, v.name, v.label, unit, qty, Math.round(unit * 100) * qty / 100, v.cost_price, v.is_combo ? 1 : 0]);
      }
      await applyLines(conn, [...merged.entries()].map(([variantId, e]) => ({ variantId, qty: e.qty })), -1,
        { type: 'sale', refType: 'order', refId: orderId, adminId, note: 'Order edited: items re-reserved' });
      subtotal = sum / 100;
      put('subtotal', subtotal);
    }

    let delivery = Number(order.delivery_fee);
    if (body.deliveryFee !== undefined && body.deliveryFee !== '') delivery = Math.max(0, Number(body.deliveryFee));
    else if (shipping && body.recalculateDelivery) delivery = shipping.charge;
    let discount = Number(order.discount);
    if (body.discount !== undefined && body.discount !== '') discount = Math.min(subtotal, Math.max(0, Number(body.discount)));
    discount = Math.min(discount, subtotal);
    put('delivery_fee', delivery);
    put('discount', discount);
    put('total', Math.round((subtotal - discount + delivery) * 100) / 100);
    if (body.source) put('source', String(body.source).slice(0, 40));
    if (body.note !== undefined) put('note', body.note ? String(body.note).slice(0, 500) : null);

    await conn.query(`UPDATE orders SET ${sets.join(', ')} WHERE id = ?`, [...params, orderId]);
    await audit(adminId, 'edit', 'order', orderId, null, conn);
    return { id: orderId };
  });
}

module.exports = { createOrderCore, changeStatusTx, changeStatus, editOrder, resolveShipping, setting };
