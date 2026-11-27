'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { bootstrap } = require('./helpers');

let t; let admin;
const customer = (phone = '01711111111') => ({ name: 'Rahim Uddin', phone });
const checkout = (items, extra = {}) => t.raw('POST', '/api/orders', { origin: false, body: {
  customer: customer(extra.phone), address: { line1: 'House 1, Road 2', city: extra.city || 'Dhaka' }, items, paymentMethod: 'cod', trackingCode: t.trackingCode(), ...extra.body,
} });
const status = async (orderId, next, body = {}) => admin.patch(`/api/admin/orders/${orderId}/status`, { status: next, ...body });
const orderRow = async (id) => (await t.pool.query('SELECT * FROM orders WHERE id = ?', [id]))[0][0];

test.before(async () => {
  t = await bootstrap('aayash_t_orders');
  await t.addAdmin('boss');
  const cookie = await t.login('boss'); admin = t.as(cookie); admin.cookie = cookie;
});
test.after(async () => { await t.close(); });

test('login returns every permission for the super admin', async () => {
  const me = await admin.get('/api/admin/auth/me');
  assert.equal(me.status, 200);
  assert.ok(me.body.user.permissions.includes('orders.manage'));
});

test('checkout: delivery fee comes from the database zones', async () => {
  const p = await t.product({ price: 100 });
  const inside = await checkout([{ variantId: p.variantId, qty: 2 }]);
  assert.equal(inside.status, 201);
  assert.equal(inside.body.deliveryFee, 70);
  assert.equal(inside.body.total, 270);
  const outside = await checkout([{ variantId: p.variantId, qty: 1 }], { city: 'Sylhet' });
  assert.equal(outside.body.deliveryFee, 120);
  const bad = await checkout([{ variantId: p.variantId, qty: 1 }], { city: 'Atlantis' });
  assert.equal(bad.status, 400);
  assert.equal(await t.stock(p.variantId), 7);
});

test('checkout: changing a zone charge changes the next order', async () => {
  const p = await t.product({ price: 100 });
  const zone = (await t.pool.query("SELECT id FROM delivery_zones WHERE code = 'outside_dhaka'"))[0][0];
  const upd = await admin.put(`/api/admin/ops/locations/zones/${zone.id}`, { code: 'outside_dhaka', name: 'Outside Dhaka', charge: 150 });
  assert.equal(upd.status, 200);
  const res = await checkout([{ variantId: p.variantId, qty: 1 }], { city: 'Khulna' });
  assert.equal(res.body.deliveryFee, 150);
  await admin.put(`/api/admin/ops/locations/zones/${zone.id}`, { code: 'outside_dhaka', name: 'Outside Dhaka', charge: 120 });
});

test('checkout: free delivery product and free-over threshold', async () => {
  const free = await t.product({ price: 100, free: true });
  const res = await checkout([{ variantId: free.variantId, qty: 1 }]);
  assert.equal(res.body.deliveryFee, 0);
  const paid = await t.product({ price: 500 });
  await t.pool.query("UPDATE site_settings SET setting_value = '400' WHERE setting_key = 'free_delivery_min_order'");
  const over = await checkout([{ variantId: paid.variantId, qty: 1 }]);
  assert.equal(over.body.deliveryFee, 0);
  await t.pool.query("UPDATE site_settings SET setting_value = '' WHERE setting_key = 'free_delivery_min_order'");
  const quote = await t.raw('POST', '/api/delivery-quote', { origin: false, body: { city: 'Dhaka', items: [{ variantId: free.variantId }], subtotal: 100 } });
  assert.equal(quote.body.charge, 0);
  assert.equal(quote.body.free, true);
});

test('checkout: idempotent retry places one order and one stock deduction', async () => {
  const p = await t.product({ stock: 5 });
  const code = t.trackingCode();
  const a = await checkout([{ variantId: p.variantId, qty: 2 }], { body: { trackingCode: code } });
  const b = await checkout([{ variantId: p.variantId, qty: 2 }], { body: { trackingCode: code } });
  assert.equal(a.status, 201); assert.equal(b.status, 200);
  assert.equal(a.body.orderNo, b.body.orderNo);
  assert.equal(await t.stock(p.variantId), 3);
});

test('checkout: refuses overselling, and concurrent buyers cannot oversell', async () => {
  const p = await t.product({ stock: 3 });
  const results = await Promise.all(Array.from({ length: 6 }, () => checkout([{ variantId: p.variantId, qty: 1 }])));
  assert.equal(results.filter((r) => r.status === 201).length, 3);
  assert.equal(results.filter((r) => r.status === 409).length, 3);
  assert.equal(await t.stock(p.variantId), 0);
  const ledger = (await t.pool.query("SELECT COALESCE(SUM(qty_change),0) AS n FROM stock_movements WHERE variant_id = ?", [p.variantId]))[0][0];
  assert.equal(Number(ledger.n), 0, 'ledger must explain every unit');
});

test('checkout: blocked phone is refused', async () => {
  const p = await t.product();
  const add = await admin.post('/api/admin/ops/blocklist', { kind: 'phone', value: '01999999999', reason: 'fake orders' });
  assert.equal(add.status, 201);
  const res = await checkout([{ variantId: p.variantId, qty: 1 }], { phone: '01999999999' });
  assert.equal(res.status, 403);
});

test('lifecycle: placed → confirmed → packaging → packed → shipment → delivered updates stock, sold count and ledger', async () => {
  const p = await t.product({ price: 200, cost: 120, stock: 10 });
  const placed = await checkout([{ variantId: p.variantId, qty: 2 }]);
  const order = (await t.pool.query('SELECT id FROM orders WHERE order_no = ?', [placed.body.orderNo]))[0][0];
  for (const s of ['confirmed', 'packaging', 'packed']) assert.equal((await status(order.id, s)).status, 200, s);
  const early = await status(order.id, 'out_for_delivery');
  assert.equal(early.status, 409, 'shipment is required first');
  const courier = { id: await t.courier('steadfast') };
  const ship = await admin.post(`/api/admin/couriers/orders/${order.id}/shipments`, { provider_id: courier.id, consignment_id: 'CN123456' });
  assert.equal(ship.status, 201);
  assert.equal((await status(order.id, 'out_for_delivery')).status, 200);
  assert.equal((await status(order.id, 'delivered')).status, 200);
  const o = await orderRow(order.id);
  assert.equal(o.payment_status, 'paid'); assert.equal(Number(o.collected_amount), 470);
  const sold = (await t.pool.query('SELECT sold_count FROM products WHERE id = ?', [p.productId]))[0][0];
  assert.equal(Number(sold.sold_count), 2);
  const income = (await t.pool.query("SELECT amount FROM transactions WHERE ref_type = 'order_collect' AND ref_id = ?", [order.id]))[0];
  assert.equal(Number(income[0].amount), 470);
  assert.equal(await t.stock(p.variantId), 8);
});

test('lifecycle: illegal jumps refused, cancel restocks once, cancelled is final', async () => {
  const p = await t.product({ stock: 4 });
  const placed = await checkout([{ variantId: p.variantId, qty: 3 }]);
  const id = (await t.pool.query('SELECT id FROM orders WHERE order_no = ?', [placed.body.orderNo]))[0][0].id;
  assert.equal((await status(id, 'delivered')).status, 409);
  assert.equal(await t.stock(p.variantId), 1);
  assert.equal((await status(id, 'cancelled', { reason: 'Customer cancelled' })).status, 200);
  assert.equal(await t.stock(p.variantId), 4);
  assert.equal((await status(id, 'cancelled')).status, 200, 'same status is a no-op');
  assert.equal(await t.stock(p.variantId), 4, 'no double restock');
  assert.equal((await status(id, 'confirmed')).status, 409);
});

async function shipped(p, qty, extra = {}) {
  const placed = await checkout([{ variantId: p.variantId, qty }], extra);
  const id = (await t.pool.query('SELECT id FROM orders WHERE order_no = ?', [placed.body.orderNo]))[0][0].id;
  await status(id, 'confirmed'); await status(id, 'packed');
  const courier = { id: await t.courier('steadfast') };
  await admin.post(`/api/admin/couriers/orders/${id}/shipments`, { provider_id: courier.id, consignment_id: `CN${Math.random().toString(36).slice(2, 10)}` });
  await status(id, 'out_for_delivery');
  return id;
}

test('partial delivery: restocks undelivered units and collects the right amount', async () => {
  const p = await t.product({ price: 100, cost: 60, stock: 10 });
  const id = await shipped(p, 4);
  const items = (await t.pool.query('SELECT id FROM order_items WHERE order_id = ?', [id]))[0];
  const none = await status(id, 'partial_delivered', { items: [{ id: items[0].id, delivered_qty: 0 }] });
  assert.equal(none.status, 400, 'nothing delivered is not a partial delivery');
  const ok = await status(id, 'partial_delivered', { items: [{ id: items[0].id, delivered_qty: 3 }] });
  assert.equal(ok.status, 200);
  assert.equal(await t.stock(p.variantId), 7, '10 - 4 + 1 restocked');
  const o = await orderRow(id);
  assert.equal(Number(o.collected_amount), 300 - 0 + 70);
  const bad = await status(id, 'cancelled');
  assert.equal(bad.status, 409);
});

test('return: delivered → return pending → returned restocks and refunds the collection', async () => {
  const p = await t.product({ price: 100, cost: 60, stock: 6 });
  const id = await shipped(p, 2);
  await status(id, 'delivered');
  assert.equal(await t.stock(p.variantId), 4);
  assert.equal((await status(id, 'return_pending')).status, 200);
  assert.equal((await status(id, 'returned')).status, 200);
  assert.equal(await t.stock(p.variantId), 6);
  const sold = (await t.pool.query('SELECT sold_count FROM products WHERE id = ?', [p.productId]))[0][0];
  assert.equal(Number(sold.sold_count), 0);
  const refund = (await t.pool.query("SELECT amount FROM transactions WHERE ref_type = 'order_return' AND ref_id = ?", [id]))[0];
  assert.equal(refund.length, 1);
  assert.equal((await orderRow(id)).payment_status, 'refunded');
});

test('failed delivery: shipment → return pending → returned restocks without refund', async () => {
  const p = await t.product({ stock: 5 });
  const id = await shipped(p, 2);
  await status(id, 'return_pending'); await status(id, 'returned');
  assert.equal(await t.stock(p.variantId), 5);
  const refund = (await t.pool.query("SELECT id FROM transactions WHERE ref_type = 'order_return' AND ref_id = ?", [id]))[0];
  assert.equal(refund.length, 0);
});

test('edit order: changing items re-reserves stock and recalculates totals', async () => {
  const a = await t.product({ price: 100, stock: 10 }); const b = await t.product({ price: 50, stock: 10 });
  const placed = await checkout([{ variantId: a.variantId, qty: 2 }]);
  const id = (await t.pool.query('SELECT id FROM orders WHERE order_no = ?', [placed.body.orderNo]))[0][0].id;
  const res = await admin.put(`/api/admin/orders/${id}`, { items: [{ variantId: b.variantId, qty: 4 }], discount: 20 });
  assert.equal(res.status, 200);
  assert.equal(await t.stock(a.variantId), 10); assert.equal(await t.stock(b.variantId), 6);
  const o = await orderRow(id);
  assert.equal(Number(o.subtotal), 200); assert.equal(Number(o.total), 200 - 20 + 70);
  await status(id, 'confirmed'); await status(id, 'packed');
  assert.equal((await admin.put(`/api/admin/orders/${id}`, { note: 'x' })).status, 409, 'packed orders are locked');
});

test('manual order, notes, bulk status, assignment and exchange', async () => {
  const p = await t.product({ price: 100, stock: 20 });
  const created = await admin.post('/api/admin/orders', { customer: customer('01822222222'), address: { line1: 'Flat 3', city: 'Dhaka' }, items: [{ variantId: p.variantId, qty: 1, unitPrice: 90 }], source: 'facebook', discount: 10 });
  assert.equal(created.status, 201);
  const id = created.body.id;
  const o = await orderRow(id);
  assert.equal(o.source, 'facebook'); assert.equal(o.order_type, 'manual'); assert.equal(Number(o.total), 90 - 10 + 70);
  assert.equal((await admin.post(`/api/admin/orders/${id}/notes`, { kind: 'courier', note: 'Handle with care' })).status, 201);
  const detail = await admin.get(`/api/admin/orders/${id}`);
  assert.equal(detail.body.notes.length, 1);
  const bulk = await admin.post('/api/admin/orders/bulk', { ids: [id, 999999], action: 'status', status: 'confirmed' });
  assert.equal(bulk.body.okCount, 1); assert.equal(bulk.body.failCount, 1);
  const list = await admin.get('/api/admin/orders?status=confirmed&source=facebook');
  assert.ok(list.body.items.some((x) => x.id === id));
  assert.ok(list.body.statusCounts.confirmed >= 1);
  const wrongOrigin = await t.raw('PATCH', `/api/admin/orders/${id}/status`, { body: { status: 'packed' }, cookie: admin.cookie, headers: { Origin: 'https://evil.example' } });
  assert.ok([401, 403].includes(wrongOrigin.status));

  const sid = await shipped(p, 3);
  await status(sid, 'delivered');
  const lines = (await t.pool.query('SELECT id FROM order_items WHERE order_id = ?', [sid]))[0];
  const other = await t.product({ price: 80, stock: 5 });
  const stockBefore = await t.stock(p.variantId);
  const ex = await admin.post('/api/admin/orders/exchange', { parentOrderId: sid, returnItems: [{ orderItemId: lines[0].id, qty: 1 }], newItems: [{ variantId: other.variantId, qty: 1 }] });
  assert.equal(ex.status, 201, JSON.stringify(ex.body));
  assert.equal(await t.stock(p.variantId), stockBefore + 1, 'returned unit restocked');
  assert.equal(await t.stock(other.variantId), 4);
  const exchanged = await orderRow(ex.body.id);
  assert.equal(exchanged.order_type, 'exchange'); assert.equal(exchanged.parent_order_id, sid);
  const refuse = await admin.post('/api/admin/orders/exchange', { parentOrderId: id, returnItems: [{ orderItemId: lines[0].id, qty: 1 }], newItems: [{ variantId: other.variantId, qty: 1 }] });
  assert.ok(refuse.status >= 400, 'only delivered orders can be exchanged');
});

test('incomplete orders: draft saved, listed, converted on checkout', async () => {
  const p = await t.product({ stock: 5 });
  const token = t.trackingCode();
  const save = await t.raw('POST', '/api/orders/draft', { origin: false, body: { draftToken: token, name: 'Ayesha', phone: '01933333333', city: 'Dhaka', items: [{ variantId: p.variantId, qty: 1, name: 'X' }], subtotal: 100 } });
  assert.equal(save.body.saved, true);
  const nophone = await t.raw('POST', '/api/orders/draft', { origin: false, body: { draftToken: t.trackingCode(), name: 'No Phone' } });
  assert.equal(nophone.body.saved, true, 'a half-typed form without a phone is kept');
  const empty = await t.raw('POST', '/api/orders/draft', { origin: false, body: { draftToken: t.trackingCode() } });
  assert.equal(empty.body.saved, false, 'nothing typed, nothing saved');
  const lp = await t.raw('POST', '/api/orders/draft', { origin: false, body: { draftToken: t.trackingCode(), name: 'From Ad', origin: 'landing', sourceUrl: 'https://x.test/lp/a?utm_source=facebook', source: { utm_source: 'facebook', utm_campaign: 'eid', fbclid: 'AbC123' } } });
  assert.equal(lp.body.saved, true);
  let drafts = await admin.get('/api/admin/orders/drafts');
  assert.ok(drafts.body.items.some((d) => d.phone === '01933333333'));
  const fromAd = drafts.body.items.find((d) => d.name === 'From Ad');
  assert.ok(fromAd && fromAd.phone === null && fromAd.utm_source === 'facebook' && fromAd.fbclid === 'AbC123' && fromAd.origin === 'landing');
  assert.ok(drafts.body.items.some((d) => d.name === 'No Phone' && d.phone === null));
  await checkout([{ variantId: p.variantId, qty: 1 }], { phone: '01933333333', body: { draftToken: token } });
  drafts = await admin.get('/api/admin/orders/drafts');
  assert.ok(!drafts.body.items.some((d) => d.phone === '01933333333'), 'converted drafts leave the open list');
});

test('tracking: public lookup masks customer data and shows status label', async () => {
  const p = await t.product();
  const placed = await checkout([{ variantId: p.variantId, qty: 1 }]);
  const res = await t.raw('POST', '/api/orders/track', { origin: false, body: { orderNo: placed.body.orderNo } });
  assert.equal(res.status, 200);
  assert.equal(res.body.status_label, 'New');
  assert.match(res.body.customer_name_masked, /\*/);
  assert.ok(!JSON.stringify(res.body).includes('01711111111'));
});

test('order processing report and invoices', async () => {
  const report = await admin.get('/api/admin/orders/processing-report');
  assert.equal(report.status, 200);
  assert.ok(report.body.staff.length >= 1, JSON.stringify(report.body).slice(0, 300));
  const [o] = (await t.pool.query('SELECT id FROM orders LIMIT 1'))[0];
  const inv = await admin.get(`/api/admin/orders/invoices?ids=${o.id}`);
  assert.equal(inv.status, 200); assert.equal(inv.body.invoices.length, 1);
});

test('storefront catalog: brands list, brand filter, deals and gift box data', async () => {
  const brand = await admin.post('/api/admin/catalog/brands', { name: 'Fresh Co', slug: `fresh-${Date.now().toString(36)}`, logo_url: '/uploads/x.png', is_active: true });
  assert.equal(brand.status, 201, JSON.stringify(brand.body));
  const p = await t.product({ price: 60, cost: 20, stock: 9 });
  await t.pool.query('UPDATE products SET brand_id = ? WHERE id = ?', [brand.body.id, p.productId]);
  const brands = await t.raw('GET', '/api/brands', { origin: false });
  assert.ok(brands.body.some((b) => b.slug === brand.body.slug && b.logo_url === '/uploads/x.png' && Number(b.product_count) === 1));
  const byBrand = await t.raw('GET', `/api/products?brand=${brand.body.slug}`, { origin: false });
  assert.equal(byBrand.body.length, 1);
  const gift = await t.product({ price: 10, cost: 2, stock: 9 });
  const cat = (await t.pool.query('SELECT id FROM categories LIMIT 1'))[0][0].id;
  const combo = await admin.post('/api/admin/ops/combos', { name: 'Deal pack', price: 65, compare_at_price: 70, category_id: cat, status: 'active', items: [{ variantId: p.variantId, qty: 1, role: 'main' }, { variantId: gift.variantId, qty: 1, role: 'gift' }] });
  assert.equal(combo.status, 201, JSON.stringify(combo.body));
  const deals = await t.raw('GET', '/api/products?combo=1', { origin: false });
  assert.ok(deals.body.length >= 1 && deals.body.every((d) => d.is_combo));
  const [[row]] = await t.pool.query('SELECT slug FROM products WHERE id = ?', [p.productId]);
  const detail = await t.raw('GET', `/api/products/${row.slug}`, { origin: false });
  assert.equal(detail.body.combos.length, 1);
  assert.equal(detail.body.combos[0].gifts.length, 1);
});
