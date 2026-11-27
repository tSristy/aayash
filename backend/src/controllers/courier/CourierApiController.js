'use strict';

const crypto = require('node:crypto');
const { pool } = require('../../../db');
const { HttpError, route, withTx, intParam, audit } = require('../../lib/http');
const { encrypt, decrypt, mask } = require('../../lib/secrets');
const { getProviderAdapter, supportedProviders } = require('../../services/courier/provider-adapters');
const { registerBuiltIns } = require('../../services/courier/adapters');
const { ACTIVE_SHIPMENT_STATUSES } = require('../../services/courier/courier-policy');
const { COURIER_BOOKABLE } = require('../../services/orders/workflow');
const { changeStatusTx } = require('../../services/orders/order-service');

registerBuiltIns();

async function loadProvider(id) {
  const [[p]] = await pool.query('SELECT * FROM courier_providers WHERE id = ?', [id]);
  if (!p) throw new HttpError(404, 'Courier not found.');
  return p;
}

function credentialsOf(provider) {
  if (!provider.api_credentials_enc) return {};
  try { return JSON.parse(decrypt(provider.api_credentials_enc) || '{}'); } catch { return {}; }
}

function adapterFor(provider) {
  if (!supportedProviders().includes(provider.code)) throw new HttpError(409, `${provider.name} has no API integration. Use manual booking.`);
  return getProviderAdapter(provider.code);
}

function describe(provider) {
  const supported = supportedProviders().includes(provider.code);
  const Adapter = supported ? getProviderAdapter(provider.code).constructor : null;
  const creds = credentialsOf(provider);
  return {
    id: provider.id, code: provider.code, name: provider.name, supported, api_enabled: Boolean(provider.api_enabled), mode: provider.api_mode || 'live',
    fields: (Adapter?.credentialFields || []).map((f) => ({ key: f.key, label: f.label, secret: f.secret, value: f.secret ? mask(creds[f.key]) : (creds[f.key] || ''), set: Boolean(creds[f.key]) })),
    webhook_path: `/api/courier/webhook/${provider.code}`,
  };
}

const getApiSettings = route(async (req, res) => res.json(describe(await loadProvider(intParam(req.params.id)))));

const saveApiSettings = route(async (req, res) => {
  const provider = await loadProvider(intParam(req.params.id));
  const adapter = adapterFor(provider);
  const current = credentialsOf(provider);
  const next = { ...current };
  for (const field of adapter.constructor.credentialFields) {
    const value = req.body?.credentials?.[field.key];
    if (value === undefined) continue;
    if (field.secret && value === '••••••••') continue;
    const clean = String(value).trim();
    if (clean.length > 500) throw new HttpError(400, `${field.label} is too long.`);
    if (clean) next[field.key] = clean; else delete next[field.key];
  }
  // Test-only escape hatch (see adapters/base.js); ignored unless explicitly enabled.
  if (process.env.COURIER_ALLOW_BASE_URL_OVERRIDE === '1' && req.body?.credentials?.base_url) next.base_url = String(req.body.credentials.base_url);
  const mode = req.body?.mode === 'sandbox' ? 'sandbox' : 'live';
  const enabled = req.body?.api_enabled ? 1 : 0;
  await pool.query('UPDATE courier_providers SET api_credentials_enc = ?, api_enabled = ?, api_mode = ?, integration_mode = ? WHERE id = ?',
    [encrypt(JSON.stringify(next)), enabled, mode, enabled ? 'api' : 'manual', provider.id]);
  await audit(req.adminUser.id, 'courier_api_settings', 'courier', provider.id, enabled ? 'enabled' : 'disabled');
  res.json(describe(await loadProvider(provider.id)));
});

const testApi = route(async (req, res) => {
  const provider = await loadProvider(intParam(req.params.id));
  const adapter = adapterFor(provider);
  try {
    const result = await adapter.test(credentialsOf(provider), provider.api_mode);
    res.json(result);
  } catch (error) {
    res.json({ ok: false, detail: error.message });
  }
});

// ----------------------------------------------------------------- booking
const bookViaApi = route(async (req, res) => {
  const orderId = intParam(req.params.orderId, 'order ID');
  const providerId = intParam(req.body?.provider_id, 'courier');
  const provider = await loadProvider(providerId);
  if (!provider.is_active || provider.is_archived) throw new HttpError(400, 'Courier is unavailable or inactive.');
  if (!provider.api_enabled) throw new HttpError(409, 'API booking is not enabled for this courier. Enable it in Courier API settings or book manually.');
  const adapter = adapterFor(provider);
  const creds = credentialsOf(provider);

  const [[order]] = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId]);
  if (!order) throw new HttpError(404, 'Order not found.');
  if (!COURIER_BOOKABLE.includes(order.status)) throw new HttpError(409, 'Confirm the order before booking a courier shipment.');
  const [active] = await pool.query(`SELECT id FROM courier_shipments WHERE order_id = ? AND status IN (${ACTIVE_SHIPMENT_STATUSES.map(() => '?').join(',')}) LIMIT 1`, [orderId, ...ACTIVE_SHIPMENT_STATUSES]);
  if (active.length) throw new HttpError(409, 'An active shipment already exists for this order.');

  // One in-flight booking per order+courier: the unique request key is the lock.
  const key = `book:${orderId}:${providerId}`;
  try {
    await pool.query("INSERT INTO courier_api_requests (provider_id, request_key, operation, status, attempt_count) VALUES (?, ?, 'book', 'pending', 1)", [providerId, key]);
  } catch (error) {
    if (error.code !== 'ER_DUP_ENTRY') throw error;
    const [claimed] = await pool.query("UPDATE courier_api_requests SET status = 'pending', attempt_count = attempt_count + 1, last_error = NULL WHERE request_key = ? AND (status = 'failed' OR (status = 'pending' AND updated_at < DATE_SUB(NOW(), INTERVAL 2 MINUTE)) OR status = 'succeeded')", [key]);
    if (!claimed.affectedRows) throw new HttpError(409, 'A booking for this order is already in progress.');
  }

  const [items] = await pool.query('SELECT name, qty FROM order_items WHERE order_id = ?', [orderId]);
  const cod = order.payment_method === 'cod' && order.payment_status !== 'paid' ? Number(order.total) - Number(order.paid_amount || 0) : 0;
  let booked;
  try {
    booked = await adapter.book(creds, provider.api_mode, {
      order, codAmount: Math.max(0, cod), note: req.body?.note ? String(req.body.note).slice(0, 300) : undefined,
      weightKg: Number(req.body?.weight_kg) || 0.5, itemCount: items.reduce((s, i) => s + Number(i.qty), 0),
      description: items.map((i) => `${i.name} x${i.qty}`).join(', '),
    });
  } catch (error) {
    await pool.query("UPDATE courier_api_requests SET status = 'failed', last_error = ? WHERE request_key = ?", [String(error.message).slice(0, 490), key]);
    throw new HttpError(error.status === 400 ? 400 : 502, error.message);
  }

  try {
    const shipmentId = await withTx(async (conn) => {
      const [[locked]] = await conn.query('SELECT id, status FROM orders WHERE id = ? FOR UPDATE', [orderId]);
      const [created] = await conn.query(`INSERT INTO courier_shipments (order_id, provider_id, consignment_id, tracking_url, status, booking_mode, cod_amount, weight_kg, note, created_by_admin_id, provider_status, booked_at)
        VALUES (?,?,?,?, 'booked', 'api', ?,?,?,?,?, NOW())`, [orderId, providerId, booked.consignmentId, booked.trackingUrl, Math.max(0, cod), Number(req.body?.weight_kg) || null, req.body?.note ? String(req.body.note).slice(0, 490) : null, req.adminUser.id, booked.providerStatus]);
      await conn.query("INSERT INTO courier_tracking_events (shipment_id, provider_status, mapped_status, source, note, created_by_admin_id) VALUES (?,?, 'booked', 'api', ?, ?)",
        [created.insertId, booked.providerStatus, `Booked through ${provider.name} API.`, req.adminUser.id]);
      await conn.query("UPDATE courier_api_requests SET status = 'succeeded', shipment_id = ? WHERE request_key = ?", [created.insertId, key]);
      if (req.body?.markShipped && locked.status === 'packed') await changeStatusTx(conn, orderId, 'out_for_delivery', { adminId: req.adminUser.id });
      return created.insertId;
    });
    res.status(201).json({ id: shipmentId, status: 'booked', consignment_id: booked.consignmentId });
  } catch (error) {
    // The courier accepted the parcel but we could not record it: surface the consignment so staff can record it manually.
    await pool.query("UPDATE courier_api_requests SET status = 'failed', last_error = ? WHERE request_key = ?", [`Booked at courier as ${booked.consignmentId} but not saved: ${error.message}`.slice(0, 490), key]);
    throw new HttpError(500, `The courier booked this parcel as ${booked.consignmentId}, but saving it failed. Record that consignment ID manually.`);
  }
});

// --------------------------------------------------------- status updates
const FINAL = new Set(['delivered', 'returned', 'cancelled']);

async function applyProviderStatus(shipmentId, providerStatus, source, adminId = null) {
  return withTx(async (conn) => {
    const [[shipment]] = await conn.query(`SELECT s.*, p.code, o.status AS order_status FROM courier_shipments s JOIN courier_providers p ON p.id = s.provider_id JOIN orders o ON o.id = s.order_id WHERE s.id = ? FOR UPDATE`, [shipmentId]);
    if (!shipment) throw new HttpError(404, 'Shipment not found.');
    const adapter = getProviderAdapter(shipment.code);
    const { status: mapped, partial } = adapter.mapStatus(providerStatus);
    await conn.query('UPDATE courier_shipments SET provider_status = ?, last_synced_at = NOW() WHERE id = ?', [String(providerStatus).slice(0, 100), shipmentId]);
    if (mapped === shipment.status || FINAL.has(shipment.status)) return { changed: false, status: shipment.status };
    await conn.query('UPDATE courier_shipments SET status = ?, updated_at = NOW() WHERE id = ?', [mapped, shipmentId]);
    await conn.query('INSERT INTO courier_tracking_events (shipment_id, provider_status, mapped_status, source, note, created_by_admin_id) VALUES (?,?,?,?,?,?)',
      [shipmentId, String(providerStatus).slice(0, 100), mapped, source, partial ? 'Courier reports a partial delivery — confirm item quantities on the order.' : null, adminId]);
    if (shipment.order_status === 'out_for_delivery') {
      if (mapped === 'delivered' && !partial) await changeStatusTx(conn, shipment.order_id, 'delivered', { adminId });
      else if (mapped === 'returning' || mapped === 'returned') await changeStatusTx(conn, shipment.order_id, 'return_pending', { adminId });
    }
    if (partial) await conn.query("INSERT INTO order_notes (order_id, kind, note) VALUES (?, 'courier', ?)", [shipment.order_id, `${shipment.code} reports a partial delivery. Open the order and use Partial Delivered to record quantities.`]);
    return { changed: true, status: mapped };
  });
}

const syncShipment = route(async (req, res) => {
  const id = intParam(req.params.id);
  const [[shipment]] = await pool.query('SELECT s.*, p.code, p.api_credentials_enc, p.api_mode FROM courier_shipments s JOIN courier_providers p ON p.id = s.provider_id WHERE s.id = ?', [id]);
  if (!shipment) throw new HttpError(404, 'Shipment not found.');
  if (shipment.booking_mode !== 'api') throw new HttpError(409, 'Only API shipments can be synced.');
  const adapter = adapterFor(shipment);
  let fetched;
  try { fetched = await adapter.fetchStatus(credentialsOf(shipment), shipment.api_mode, shipment); } catch (error) { throw new HttpError(502, error.message); }
  const result = await applyProviderStatus(id, fetched.providerStatus, 'api', req.adminUser.id);
  res.json({ ...result, provider_status: fetched.providerStatus });
});

async function syncActiveShipments(log = () => {}) {
  const [rows] = await pool.query(`SELECT s.id FROM courier_shipments s JOIN courier_providers p ON p.id = s.provider_id
    WHERE s.booking_mode = 'api' AND p.api_enabled = 1 AND s.status IN ('booked','picked_up','in_transit','returning') ORDER BY s.last_synced_at IS NULL DESC, s.last_synced_at LIMIT 100`);
  let changed = 0;
  for (const { id } of rows) {
    try {
      const [[shipment]] = await pool.query('SELECT s.*, p.code, p.api_credentials_enc, p.api_mode FROM courier_shipments s JOIN courier_providers p ON p.id = s.provider_id WHERE s.id = ?', [id]);
      const fetched = await getProviderAdapter(shipment.code).fetchStatus(credentialsOf(shipment), shipment.api_mode, shipment);
      const result = await applyProviderStatus(id, fetched.providerStatus, 'api');
      if (result.changed) changed += 1;
    } catch (error) { log(`courier sync ${id}: ${error.message}`); }
  }
  return { checked: rows.length, changed };
}

// Public webhook. Each provider authenticates with its own shared secret.
const webhook = route(async (req, res) => {
  const code = String(req.params.code || '').toLowerCase();
  const [[provider]] = await pool.query('SELECT * FROM courier_providers WHERE code = ? AND api_enabled = 1', [code]);
  if (!provider || !supportedProviders().includes(code)) return res.status(404).json({ error: 'Not found.' });
  const parsed = getProviderAdapter(code).parseWebhook(credentialsOf(provider), req.headers, req.body);
  if (parsed.error === 'unauthorized' || parsed.error?.includes('not configured')) return res.status(401).json({ error: 'Unauthorized.' });
  if (parsed.error) return res.json({ ok: true, ignored: true });
  const eventKey = crypto.createHash('sha256').update(parsed.eventKey).digest('hex');
  try {
    await pool.query("INSERT INTO courier_webhook_events (provider_id, event_key, event_type, status) VALUES (?,?,?, 'received')", [provider.id, eventKey, String(parsed.eventType || '').slice(0, 80)]);
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return res.json({ ok: true, duplicate: true });
    throw error;
  }
  const [[shipment]] = await pool.query('SELECT id FROM courier_shipments WHERE provider_id = ? AND consignment_id = ?', [provider.id, parsed.consignmentId]);
  if (shipment) await applyProviderStatus(shipment.id, parsed.providerStatus, 'webhook');
  await pool.query("UPDATE courier_webhook_events SET status = 'processed', processed_at = NOW() WHERE provider_id = ? AND event_key = ?", [provider.id, eventKey]);
  res.json({ ok: true });
});

module.exports = { getApiSettings, saveApiSettings, testApi, bookViaApi, syncShipment, syncActiveShipments, webhook, applyProviderStatus };
