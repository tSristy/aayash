'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { bootstrap } = require('./helpers');

let t; let admin; let mock; let mockBase; let providerId; let statusFor = 'pending'; let bookCalls = 0; let failBooking = false;

test.before(async () => {
  process.env.SETTINGS_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  mock = http.createServer((req, res) => {
    let body = ''; req.on('data', (c) => { body += c; });
    req.on('end', () => {
      res.setHeader('Content-Type', 'application/json');
      if (req.headers['api-key'] !== 'KEY') { res.statusCode = 401; return res.end('{"message":"bad key"}'); }
      if (req.url === '/get_balance') return res.end('{"status":200,"current_balance":1500}');
      if (req.url === '/create_order') {
        bookCalls += 1;
        if (failBooking) { res.statusCode = 500; return res.end('{"message":"down"}'); }
        return res.end(JSON.stringify({ status: 200, consignment: { consignment_id: 9000 + bookCalls, tracking_code: 'TRK1', status: 'pending', body } }));
      }
      if (req.url.startsWith('/status_by_cid/')) return res.end(JSON.stringify({ status: 200, delivery_status: statusFor }));
      res.statusCode = 404; res.end('{}');
    });
  });
  await new Promise((r) => mock.listen(0, '127.0.0.1', r));
  mockBase = `http://127.0.0.1:${mock.address().port}`;
  t = await bootstrap('aayash_t_courier');
  await t.addAdmin('boss');
  const cookie = await t.login('boss'); admin = t.as(cookie); admin.cookie = cookie;
  providerId = await t.courier('steadfast');
});
test.after(async () => { await t.close(); await new Promise((r) => mock.close(r)); });

async function packedOrder() {
  const p = await t.product({ price: 100, stock: 10 });
  const placed = await t.raw('POST', '/api/orders', { origin: false, body: { customer: { name: 'Rahim', phone: '01711111111' }, address: { line1: 'House 1', city: 'Dhaka' }, items: [{ variantId: p.variantId, qty: 1 }], paymentMethod: 'cod', trackingCode: t.trackingCode() } });
  const id = (await t.pool.query('SELECT id FROM orders WHERE order_no = ?', [placed.body.orderNo]))[0][0].id;
  await admin.patch(`/api/admin/orders/${id}/status`, { status: 'confirmed' });
  await admin.patch(`/api/admin/orders/${id}/status`, { status: 'packed' });
  return { id, p };
}

test('credentials are encrypted at rest, masked on read, never echoed', async () => {
  const save = await admin.put(`/api/admin/couriers/providers/${providerId}/api`, { api_enabled: true, mode: 'live', credentials: { api_key: 'KEY', secret_key: 'SECRET', webhook_token: 'HOOK', base_url: mockBase } });
  assert.equal(save.status, 200, JSON.stringify(save.body));
  const raw = (await t.pool.query('SELECT api_credentials_enc FROM courier_providers WHERE id = ?', [providerId]))[0][0].api_credentials_enc;
  assert.ok(raw && !raw.includes('SECRET') && !raw.includes('KEY'));
  const read = await admin.get(`/api/admin/couriers/providers/${providerId}/api`);
  assert.ok(!JSON.stringify(read.body).includes('SECRET'));
  const again = await admin.put(`/api/admin/couriers/providers/${providerId}/api`, { api_enabled: true, mode: 'live', credentials: { api_key: '••••••••', secret_key: '••••••••' } });
  assert.equal(again.status, 200);
  assert.equal((await admin.post(`/api/admin/couriers/providers/${providerId}/api/test`)).body.ok, true, 'masked values keep stored secrets');
});

test('base_url override is ignored outside test mode (SSRF guard)', async () => {
  process.env.COURIER_ALLOW_BASE_URL_OVERRIDE = '0';
  await admin.put(`/api/admin/couriers/providers/${providerId}/api`, { api_enabled: true, credentials: { base_url: 'http://169.254.169.254' } });
  const stored = await admin.get(`/api/admin/couriers/providers/${providerId}/api`);
  assert.ok(!JSON.stringify(stored.body).includes('169.254'));
  process.env.COURIER_ALLOW_BASE_URL_OVERRIDE = '1';
  await admin.put(`/api/admin/couriers/providers/${providerId}/api`, { api_enabled: true, credentials: { base_url: mockBase } });
});

test('book through the API: shipment created, order moves to shipment, retry is idempotent', async () => {
  const { id } = await packedOrder();
  const key = `book-${id}-1`;
  const a = await admin.post(`/api/admin/couriers/orders/${id}/book-api`, { provider_id: providerId, requestKey: key, markShipped: true });
  assert.equal(a.status, 201, JSON.stringify(a.body));
  const calls = bookCalls;
  const b = await admin.post(`/api/admin/couriers/orders/${id}/book-api`, { provider_id: providerId, requestKey: key, markShipped: true });
  assert.ok([200, 201, 409].includes(b.status), JSON.stringify(b.body));
  assert.equal(bookCalls, calls, 'no second call to the courier');
  const o = (await t.pool.query('SELECT status FROM orders WHERE id = ?', [id]))[0][0];
  assert.equal(o.status, 'out_for_delivery');
  assert.equal((await t.pool.query('SELECT COUNT(*) AS n FROM courier_shipments WHERE order_id = ?', [id]))[0][0].n, 1);
});

test('failed booking leaves the order untouched and can be retried', async () => {
  const { id } = await packedOrder();
  failBooking = true;
  const bad = await admin.post(`/api/admin/couriers/orders/${id}/book-api`, { provider_id: providerId, requestKey: `book-${id}-a` });
  assert.ok(bad.status >= 400);
  assert.equal((await t.pool.query('SELECT COUNT(*) AS n FROM courier_shipments WHERE order_id = ?', [id]))[0][0].n, 0);
  assert.equal((await t.pool.query('SELECT status FROM orders WHERE id = ?', [id]))[0][0].status, 'packed');
  failBooking = false;
  const ok = await admin.post(`/api/admin/couriers/orders/${id}/book-api`, { provider_id: providerId, requestKey: `book-${id}-b` });
  assert.equal(ok.status, 201, JSON.stringify(ok.body));
});

test('sync and webhook deliver the order; wrong token rejected; duplicates ignored', async () => {
  const { id } = await packedOrder();
  const b = await admin.post(`/api/admin/couriers/orders/${id}/book-api`, { provider_id: providerId, requestKey: `book-${id}-z`, markShipped: true });
  const ship = (await t.pool.query('SELECT id, consignment_id FROM courier_shipments WHERE order_id = ?', [id]))[0][0];
  statusFor = 'in_review';
  assert.equal((await admin.post(`/api/admin/couriers/shipments/${ship.id}/sync`)).status, 200);
  assert.equal((await t.pool.query('SELECT status FROM orders WHERE id = ?', [id]))[0][0].status, 'out_for_delivery');

  const hook = (token, body) => t.raw('POST', '/api/courier/webhook/steadfast', { origin: false, headers: token ? { Authorization: `Bearer ${token}` } : {}, body });
  assert.equal((await hook('WRONG', { consignment_id: ship.consignment_id, status: 'delivered' })).status, 401);
  assert.equal((await hook(null, { consignment_id: ship.consignment_id, status: 'delivered' })).status, 401);
  const good = await hook('HOOK', { consignment_id: ship.consignment_id, status: 'delivered', updated_at: 't1' });
  assert.equal(good.status, 200);
  const o = (await t.pool.query('SELECT status, payment_status FROM orders WHERE id = ?', [id]))[0][0];
  assert.equal(o.status, 'delivered'); assert.equal(o.payment_status, 'paid');
  const dup = await hook('HOOK', { consignment_id: ship.consignment_id, status: 'delivered', updated_at: 't1' });
  assert.equal(dup.body.duplicate, true);
  assert.equal((await t.pool.query("SELECT COUNT(*) AS n FROM transactions WHERE ref_type = 'order_collect' AND ref_id = ?", [id]))[0][0].n, 1, 'collected exactly once');
});

test('a courier "partial delivered" signal never changes the order by itself', async () => {
  const { id } = await packedOrder();
  await admin.post(`/api/admin/couriers/orders/${id}/book-api`, { provider_id: providerId, requestKey: `book-${id}-p`, markShipped: true });
  const ship = (await t.pool.query('SELECT consignment_id FROM courier_shipments WHERE order_id = ?', [id]))[0][0];
  await t.raw('POST', '/api/courier/webhook/steadfast', { origin: false, headers: { Authorization: 'Bearer HOOK' }, body: { consignment_id: ship.consignment_id, status: 'partial_delivered', updated_at: 'p1' } });
  assert.equal((await t.pool.query('SELECT status FROM orders WHERE id = ?', [id]))[0][0].status, 'out_for_delivery');
});

test('bad credentials surface a clear error, not a crash', async () => {
  await admin.put(`/api/admin/couriers/providers/${providerId}/api`, { api_enabled: true, credentials: { api_key: 'WRONG' } });
  const res = await admin.post(`/api/admin/couriers/providers/${providerId}/api/test`);
  assert.ok(res.status >= 400 || res.body.ok === false);
});
