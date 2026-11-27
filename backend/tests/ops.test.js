'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { bootstrap } = require('./helpers');

let t; let admin; let accountId;
const O = '/api/admin/ops';
const bal = async (id) => Number((await admin.get(`${O}/accounts`)).body.items.find((a) => a.id === id).balance);

test.before(async () => {
  t = await bootstrap('aayash_t_ops');
  await t.addAdmin('boss');
  const cookie = await t.login('boss'); admin = t.as(cookie); admin.cookie = cookie;
  accountId = (await t.pool.query('SELECT id FROM accounts ORDER BY id LIMIT 1'))[0][0].id;
});
test.after(async () => { await t.close(); });

test('dashboard and reports respond with the expected shape', async () => {
  const d = await admin.get(`${O}/dashboard`);
  assert.equal(d.status, 200);
  for (const k of ['tiles', 'kpis', 'daily', 'sources', 'topProducts', 'recentOrders', 'attention']) assert.ok(k in d.body, k);
  for (const path of ['reports/sales', 'reports/profit-loss', 'reports/stock', 'reports/couriers']) assert.equal((await admin.get(`${O}/${path}`)).status, 200, path);
});

test('POS: sale deducts stock and records income; return restocks and refunds', async () => {
  const p = await t.product({ price: 80, cost: 40, stock: 10 });
  const before = await bal(accountId);
  const sale = await admin.post(`${O}/pos/sale`, { items: [{ variantId: p.variantId, qty: 3 }], paidAmount: 300, accountId, paymentMethod: 'cash' });
  assert.equal(sale.status, 201, JSON.stringify(sale.body));
  assert.equal(sale.body.total, 240); assert.equal(sale.body.change, 60);
  assert.equal(await t.stock(p.variantId), 7);
  assert.equal(await bal(accountId), before + 240);
  const over = await admin.post(`${O}/pos/sale`, { items: [{ variantId: p.variantId, qty: 99 }], paidAmount: 9999 });
  assert.equal(over.status, 409);
  const ret = await admin.post(`${O}/pos/sales/${sale.body.id}/return`);
  assert.equal(ret.status, 200);
  assert.equal(await t.stock(p.variantId), 10);
  assert.equal(await bal(accountId), before);
  assert.equal((await admin.post(`${O}/pos/sales/${sale.body.id}/return`)).status, 409, 'cannot return twice');
  const list = await admin.get(`${O}/pos/sales`);
  assert.ok(list.body.items.length >= 1);
});

test('POS: discount is capped at the subtotal, never negative', async () => {
  const p = await t.product({ price: 50, stock: 5 });
  const res = await admin.post(`${O}/pos/sale`, { items: [{ variantId: p.variantId, qty: 1 }], discount: 500, paidAmount: 0 });
  assert.equal(res.status, 201);
  assert.equal(res.body.total, 0);
  const neg = await admin.post(`${O}/pos/sale`, { items: [{ variantId: p.variantId, qty: 1 }], discount: -20, paidAmount: 50 });
  assert.equal(neg.body.total, 50);
});

test('purchases: stock up, weighted-average cost, supplier due, payment, cancel reverses', async () => {
  const p = await t.product({ price: 100, cost: 40, stock: 10 });
  const sup = await admin.post(`${O}/suppliers`, { name: 'Fresh Farms', phone: '01700000000' });
  assert.equal(sup.status, 201);
  const before = await bal(accountId);
  const pur = await admin.post(`${O}/purchases`, { supplierId: sup.body.id, items: [{ variantId: p.variantId, qty: 10, unitCost: 60 }], paid: 200, accountId });
  assert.equal(pur.status, 201, JSON.stringify(pur.body));
  assert.equal(await t.stock(p.variantId), 20);
  const v = (await t.pool.query('SELECT cost_price FROM product_variants WHERE id = ?', [p.variantId]))[0][0];
  assert.equal(Number(v.cost_price), 50, '(10×40 + 10×60) / 20');
  assert.equal(await bal(accountId), before - 200);
  const detail = await admin.get(`${O}/suppliers/${sup.body.id}`);
  assert.equal(Number(detail.body.due), 400);
  const pay = await admin.post(`${O}/suppliers/${sup.body.id}/pay`, { amount: 150, accountId });
  assert.equal(pay.status, 200);
  assert.equal(Number((await admin.get(`${O}/suppliers/${sup.body.id}`)).body.due), 250);
  assert.equal((await admin.post(`${O}/suppliers/${sup.body.id}/pay`, { amount: 99999, accountId })).status >= 400, true);
  const cancel = await admin.post(`${O}/purchases/${pur.body.id}/cancel`);
  assert.equal(cancel.status, 200, JSON.stringify(cancel.body));
  assert.equal(await t.stock(p.variantId), 10);
  assert.equal((await admin.post(`${O}/purchases/${pur.body.id}/cancel`)).status, 409);
  assert.ok((await admin.del(`${O}/suppliers/${sup.body.id}`)).status >= 400, 'supplier with history is kept');
});

test('accounts: manual income/expense, balance guard, transfers, delete rules', async () => {
  const purposes = (await admin.get(`${O}/purposes`)).body.items;
  const inc = purposes.find((x) => x.kind === 'income'); const exp = purposes.find((x) => x.kind === 'expense');
  const bank = await admin.post(`${O}/accounts`, { name: 'bKash', kind: 'mobile', opening_balance: 0 });
  assert.equal(bank.status, 201, JSON.stringify(bank.body));
  const i = await admin.post(`${O}/transactions`, { kind: 'income', accountId: bank.body.id, purposeId: inc.id, amount: 1000, note: 'Seed' });
  assert.equal(i.status, 201);
  assert.equal(await bal(bank.body.id), 1000);
  assert.equal((await admin.post(`${O}/transactions`, { kind: 'expense', accountId: bank.body.id, purposeId: exp.id, amount: 5000 })).status, 400, 'overdraft refused');
  assert.equal((await admin.post(`${O}/transactions`, { kind: 'expense', accountId: bank.body.id, purposeId: inc.id, amount: 5 })).status, 400, 'purpose must match kind');
  const tr = await admin.post(`${O}/transfers`, { fromAccountId: bank.body.id, toAccountId: accountId, amount: 400 });
  assert.equal(tr.status, 201, JSON.stringify(tr.body));
  assert.equal(await bal(bank.body.id), 600);
  assert.equal((await admin.post(`${O}/transfers`, { fromAccountId: bank.body.id, toAccountId: bank.body.id, amount: 1 })).status, 400);
  assert.equal((await admin.post(`${O}/transfers`, { fromAccountId: bank.body.id, toAccountId: accountId, amount: 9999 })).status, 400);
  assert.equal((await admin.del(`${O}/transactions/${i.body.id}`)).status, 200);
  assert.equal(await bal(bank.body.id), 600 - 1000, 'deleting the income removes it from the balance');
});

test('accounts: salary, bills and dues', async () => {
  const emp = await admin.post(`${O}/employees`, { name: 'Karim', designation: 'Packer', monthly_salary: 12000 });
  assert.equal(emp.status, 201);
  await admin.post(`${O}/transactions`, { kind: 'income', accountId, purposeId: (await admin.get(`${O}/purposes`)).body.items.find((x) => x.kind === 'income').id, amount: 50000 });
  const pay = await admin.post(`${O}/salary`, { employeeId: emp.body.id, accountId, month: '2026-11', amount: 12000 });
  assert.equal(pay.status, 201, JSON.stringify(pay.body));
  assert.equal((await admin.post(`${O}/salary`, { employeeId: emp.body.id, accountId, month: 'bad', amount: 1 })).status, 400);
  assert.equal((await admin.post(`${O}/salary`, { employeeId: emp.body.id, accountId, month: '2026-11', amount: 9999999 })).status, 400, 'overdraft refused');
  const bill = await admin.post(`${O}/bills`, { title: 'Electricity', amount: 3000, due_date: '2026-12-05' });
  assert.equal(bill.status, 201);
  assert.equal((await admin.post(`${O}/bills/${bill.body.id}/pay`, { accountId })).status, 200);
  assert.ok((await admin.post(`${O}/bills/${bill.body.id}/pay`, { accountId })).status >= 400, 'bill paid once');
  const due = await admin.post(`${O}/dues`, { direction: 'receivable', party_name: 'Shop A', amount: 500 });
  assert.equal(due.status, 201, JSON.stringify(due.body));
  assert.equal((await admin.post(`${O}/dues/${due.body.id}/pay`, { amount: 500, accountId })).status, 200);
});

test('combos: virtual stock follows components and sells through the order engine', async () => {
  const a = await t.product({ price: 50, cost: 20, stock: 10 }); const b = await t.product({ price: 30, cost: 10, stock: 7 });
  const cat = (await t.pool.query('SELECT id FROM categories LIMIT 1'))[0][0].id;
  const combo = await admin.post(`${O}/combos`, { name: 'Breakfast pack', price: 70, category_id: cat, status: 'active', items: [{ variantId: a.variantId, qty: 2, role: 'main' }, { variantId: b.variantId, qty: 1, role: 'gift' }] });
  assert.equal(combo.status, 201, JSON.stringify(combo.body));
  const cv = (await t.pool.query('SELECT id, stock FROM product_variants WHERE product_id = ?', [combo.body.id]))[0][0];
  assert.equal(Number(cv.stock), 5, 'min(10/2, 7/1)');
  const order = await t.raw('POST', '/api/orders', { origin: false, body: { customer: { name: 'Rina', phone: '01755555555' }, address: { line1: 'x', city: 'Dhaka' }, items: [{ variantId: cv.id, qty: 2 }], paymentMethod: 'cod', trackingCode: t.trackingCode() } });
  assert.equal(order.status, 201, JSON.stringify(order.body));
  assert.equal(await t.stock(a.variantId), 6); assert.equal(await t.stock(b.variantId), 5);
  assert.equal(await t.stock(cv.id), 3);
  await admin.post(`${O}/stock/adjust`, { variantId: b.variantId, change: -4, note: 'Spoiled' });
  assert.equal(await t.stock(cv.id), 1, 'combo stock re-synced after a component change');
  const dup = await admin.post(`${O}/combos`, { name: 'Bad', price: 10, category_id: cat, items: [{ variantId: cv.id, qty: 1, role: 'main' }, { variantId: a.variantId, qty: 1, role: 'gift' }] });
  assert.equal(dup.status, 400, 'combos cannot contain combos');
  const noGift = await admin.post(`${O}/combos`, { name: 'No gift', price: 10, category_id: cat, items: [{ variantId: a.variantId, qty: 1, role: 'main' }, { variantId: b.variantId, qty: 1, role: 'main' }] });
  assert.equal(noGift.status, 400, 'a combo needs one main product and a gift');
});

test('combos: gift mode with_main adds free gifts to the main product, combo_only does not', async () => {
  const main = await t.product({ price: 100, cost: 40, stock: 10 }); const gift = await t.product({ price: 20, cost: 5, stock: 6 });
  const cat = (await t.pool.query('SELECT id FROM categories LIMIT 1'))[0][0].id;
  const items = [{ variantId: main.variantId, qty: 1, role: 'main' }, { variantId: gift.variantId, qty: 2, role: 'gift' }];
  const combo = await admin.post(`${O}/combos`, { name: 'Gift pack', price: 110, category_id: cat, status: 'active', gift_mode: 'combo_only', items });
  assert.equal(combo.status, 201, JSON.stringify(combo.body));
  const place = (qty) => t.raw('POST', '/api/orders', { origin: false, body: { customer: { name: 'Gina', phone: '01766666666' }, address: { line1: 'x', city: 'Dhaka' }, items: [{ variantId: main.variantId, qty }], paymentMethod: 'cod', trackingCode: t.trackingCode() } });
  assert.equal((await place(1)).status, 201);
  assert.equal(await t.stock(gift.variantId), 6, 'combo_only: no gift on the single product');
  const upd = await admin.put(`${O}/combos/${combo.body.id}`, { name: 'Gift pack', price: 110, category_id: cat, status: 'active', gift_mode: 'with_main', items });
  assert.equal(upd.status, 200, JSON.stringify(upd.body));
  const o = await place(2);
  assert.equal(o.status, 201, JSON.stringify(o.body));
  assert.equal(await t.stock(gift.variantId), 2, 'with_main: 2 orders x 2 gifts = 4 deducted');
  const lines = (await t.pool.query('SELECT unit_price, qty FROM order_items WHERE order_id = ? AND unit_price = 0', [o.body.orderId]))[0];
  assert.equal(lines.length, 1); assert.equal(Number(lines[0].qty), 4);
  assert.equal(Number(o.body.total ?? 0) >= 0, true);
  await admin.post(`${O}/stock/adjust`, { variantId: gift.variantId, change: -2, note: 'out' });
  assert.equal((await place(1)).status, 201, 'gift out of stock never blocks the main order');
});

test('stock: adjust, damage write-off, low stock, ledger and CSV export', async () => {
  const p = await t.product({ stock: 4 });
  await t.pool.query('UPDATE products SET low_stock_level = 5 WHERE id = ?', [p.productId]);
  assert.equal((await admin.post(`${O}/stock/adjust`, { variantId: p.variantId, change: -10, note: 'oops' })).status, 409);
  assert.equal((await admin.post(`${O}/stock/adjust`, { variantId: p.variantId, change: 6, note: 'Recount' })).status, 200);
  const cashBefore = await bal(accountId);
  assert.equal((await admin.post(`${O}/damages`, { variantId: p.variantId, qty: 2, reason: 'Broken' })).status, 201);
  assert.equal(await t.stock(p.variantId), 8);
  assert.equal(await bal(accountId), cashBefore, 'damage is not a cash expense');
  const low = await admin.get(`${O}/stock/low`);
  assert.ok(Array.isArray(low.body.items));
  const ledger = await admin.get(`${O}/stock/ledger?variant_id=${p.variantId}`);
  assert.equal(ledger.body.items.length, 3);
  const exp = await t.raw('GET', `${O}/products/export`, { cookie: admin.cookie });
  assert.equal(exp.status, 200);
});

test('customers: created from orders, block/unblock, order refused while blocked', async () => {
  const p = await t.product({ stock: 5 });
  const mk = () => t.raw('POST', '/api/orders', { origin: false, body: { customer: { name: 'Sakib', phone: '01688888888' }, address: { line1: 'x', city: 'Dhaka' }, items: [{ variantId: p.variantId, qty: 1 }], paymentMethod: 'cod', trackingCode: t.trackingCode() } });
  assert.equal((await mk()).status, 201);
  const list = await admin.get(`${O}/customers?q=01688888888`);
  assert.equal(list.body.items.length, 1);
  const id = list.body.items[0].id;
  assert.equal(Number(list.body.items[0].orders_count), 1);
  assert.equal((await admin.post(`${O}/customers/${id}/block`, { reason: 'Fake' })).status, 200);
  assert.equal((await mk()).status, 403);
  assert.equal((await admin.post(`${O}/customers/${id}/unblock`)).status, 200);
  assert.equal((await mk()).status, 201);
  assert.equal((await admin.get(`${O}/customers/${id}`)).body.orders.length, 2);
});

test('permissions: scoped role sees only what it was given', async () => {
  const role = await admin.post(`${O}/roles`, { name: 'Packer', permissions: ['orders.view'] });
  assert.equal(role.status, 201, JSON.stringify(role.body));
  const user = await admin.post(`${O}/admins`, { username: 'packer1', name: 'Packer', password: 'Secret#123', role_id: role.body.id });
  assert.equal(user.status, 201, JSON.stringify(user.body));
  const staff = t.as(await t.login('packer1'));
  assert.equal((await staff.get('/api/admin/orders')).status, 200);
  assert.equal((await staff.get(`${O}/dashboard`)).status, 403);
  assert.equal((await staff.get(`${O}/accounts`)).status, 403);
  assert.equal((await staff.get(`${O}/roles`)).status, 403);
  assert.equal((await staff.patch('/api/admin/orders/1/status', { status: 'confirmed' })).status, 403);
  assert.equal((await staff.post('/api/admin/catalog/categories', { name: 'X' })).status, 403);
  const me = await staff.get('/api/admin/auth/me');
  assert.deepEqual(me.body.user.permissions, ['orders.view']);
  assert.equal((await t.raw('GET', `${O}/dashboard`)).status, 401, 'anonymous is refused');
  assert.equal((await admin.del(`${O}/roles/${role.body.id}`)).status, 409, 'role in use cannot be deleted');
  assert.equal((await admin.post(`${O}/admins/${user.body.id}/reset-password`, { password: 'NewSecret#456' })).status, 200);
  assert.equal((await t.raw('POST', '/api/admin/auth/login', { body: { username: 'packer1', password: 'Secret#123' } })).status, 401);
});

test('engagement: contact message, review moderation, newsletter', async () => {
  const p = await t.product();
  assert.equal((await t.raw('POST', '/api/contact', { origin: false, body: { name: 'A', phone: '01711111111', message: 'Hello there, do you deliver?' } })).status, 201);
  assert.equal((await admin.get(`${O}/messages`)).body.items.length, 1);
  const rv = await t.raw('POST', '/api/reviews', { origin: false, body: { productSlug: p.slug, author: 'Sam', rating: 5, body: 'Great' } });
  assert.equal(rv.status, 201, JSON.stringify(rv.body));
  const pub1 = await t.raw('GET', `/api/products/${p.slug}`, { origin: false });
  assert.equal((pub1.body.reviews || []).length, 0, 'pending reviews are hidden');
  const pending = (await admin.get(`${O}/reviews?status=pending`)).body.items[0];
  assert.equal((await admin.patch(`${O}/reviews/${pending.id}`, { status: 'approved', admin_reply: 'Thanks!' })).status, 200);
  const pub2 = await t.raw('GET', `/api/products/${p.slug}`, { origin: false });
  assert.equal(pub2.body.reviews.length, 1);
});

test('public site: settings hide secrets, locations and CMS pages', async () => {
  const site = await t.raw('GET', '/api/site', { origin: false });
  assert.equal(site.status, 200);
  assert.ok(!JSON.stringify(site.body).includes('encrypt'));
  const loc = await t.raw('GET', '/api/locations', { origin: false });
  assert.ok(loc.body.cities.length >= 60);
  assert.equal((await t.raw('GET', '/api/pages/does-not-exist', { origin: false })).status, 404);
  const pol = (await t.pool.query('SELECT slug FROM cms_pages WHERE is_published = 1 LIMIT 1'))[0][0];
  assert.equal((await t.raw('GET', `/api/pages/${pol.slug}`, { origin: false })).status, 200);
  const put = await admin.put(`${O}/settings/website`, { theme_primary: '#112233' });
  assert.equal(put.status, 200, JSON.stringify(put.body));
  assert.equal((await admin.put(`${O}/settings/website`, { theme_primary: 'red;}</style>' })).status, 400, 'colors are validated');
  assert.equal((await t.raw('GET', '/api/site', { origin: false })).body.settings.theme_primary, '#112233');
});

test('customer accounts: register, login, own orders, logout', async () => {
  const reg = await t.raw('POST', '/api/customer/auth/register', { origin: false, body: { name: 'Nusrat', phone: '01844444444', email: 'n@example.com', password: 'Passw0rd!x' } });
  assert.equal(reg.status, 201, JSON.stringify(reg.body));
  const cookie = reg.headers.get('set-cookie').split(';')[0];
  const me = await t.raw('GET', '/api/customer/me', { origin: false, cookie });
  assert.equal(me.body.customer.phone, '01844444444');
  assert.equal((await t.raw('POST', '/api/customer/auth/login', { origin: false, body: { phone: '01844444444', password: 'wrong' } })).status, 401);
  assert.equal((await t.raw('POST', '/api/customer/auth/logout', { origin: false, cookie })).status, 200);
  assert.equal((await t.raw('GET', '/api/customer/me', { origin: false, cookie })).body.customer ?? null, null);
});
