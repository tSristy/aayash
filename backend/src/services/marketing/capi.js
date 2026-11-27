'use strict';

const crypto = require('node:crypto');
const { pool } = require('../../../db');
const settings = require('../settings');
const { normalizePhone } = require('../orders/order-policy');

const GRAPH = process.env.META_GRAPH_BASE || 'https://graph.facebook.com/v25.0';
const sha = (value) => crypto.createHash('sha256').update(String(value).trim().toLowerCase()).digest('hex');

function userData(order, ctx) {
  const phone = normalizePhone(order.guest_phone);
  const [first, ...rest] = String(order.guest_name || '').trim().split(/\s+/);
  const data = {
    ph: phone ? [sha(`88${phone}`)] : undefined,
    em: order.guest_email ? [sha(order.guest_email)] : undefined,
    fn: first ? [sha(first)] : undefined, ln: rest.length ? [sha(rest.join(' '))] : undefined,
    ct: order.city ? [sha(String(order.city).replace(/\s+/g, ''))] : undefined, country: [sha('bd')],
    client_ip_address: ctx.ip || undefined, client_user_agent: ctx.userAgent || undefined,
    fbp: ctx.fbp || undefined, fbc: ctx.fbc || undefined,
    external_id: order.customer_id ? [sha(`customer-${order.customer_id}`)] : undefined,
  };
  return Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined));
}

async function send(rowId) {
  const [[row]] = await pool.query('SELECT * FROM capi_events WHERE id = ?', [rowId]);
  if (!row || row.status === 'sent') return;
  const all = await settings.getAll();
  if (all.capi_enabled !== '1' || !all.pixel_id || !all.capi_access_token) {
    await pool.query("UPDATE capi_events SET status = 'skipped', response = 'Conversions API is not enabled or not configured.' WHERE id = ?", [rowId]);
    return;
  }
  try {
    const body = { data: [JSON.parse(row.payload)], ...(all.capi_test_code ? { test_event_code: all.capi_test_code } : {}) };
    const response = await fetch(`${GRAPH}/${encodeURIComponent(all.pixel_id)}/events?access_token=${encodeURIComponent(all.capi_access_token)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000),
    });
    const text = await response.text();
    await pool.query('UPDATE capi_events SET status = ?, attempts = attempts + 1, response = ? WHERE id = ?',
      [response.ok ? 'sent' : 'failed', text.slice(0, 480), rowId]);
  } catch (error) {
    await pool.query("UPDATE capi_events SET status = 'failed', attempts = attempts + 1, response = ? WHERE id = ?", [String(error.message).slice(0, 480), rowId]);
  }
}

/** Queue the server-side Purchase. event_id matches the browser pixel's eventID so Meta counts it once. */
async function queuePurchase(orderId, req) {
  try {
    const all = await settings.getAll();
    if (all.capi_enabled !== '1') return;
    const [[order]] = await pool.query('SELECT * FROM orders WHERE id = ?', [orderId]);
    if (!order) return;
    const [items] = await pool.query('SELECT product_id, qty, unit_price FROM order_items WHERE order_id = ?', [orderId]);
    const ctx = { ip: req.ip, userAgent: req.get('user-agent'), fbp: req.body?.fbp, fbc: req.body?.fbc };
    const site = (await settings.get('public_site_url')) || (process.env.CORS_ORIGIN || '').split(',')[0] || '';
    const payload = {
      event_name: 'Purchase', event_time: Math.floor(Date.now() / 1000), event_id: `purchase-${orderId}`, action_source: 'website',
      event_source_url: typeof req.body?.sourceUrl === 'string' && /^https?:\/\//.test(req.body.sourceUrl) ? req.body.sourceUrl.slice(0, 500) : `${site}/cart`,
      user_data: userData(order, ctx),
      custom_data: { currency: 'BDT', value: Number(order.total), content_type: 'product', content_ids: items.map((i) => String(i.product_id)), num_items: items.reduce((s, i) => s + Number(i.qty), 0), order_id: order.order_no },
    };
    const [inserted] = await pool.query("INSERT IGNORE INTO capi_events (event_id, event_name, order_id, status, payload) VALUES (?, 'Purchase', ?, 'pending', ?)", [payload.event_id, orderId, JSON.stringify(payload)]);
    if (inserted.insertId) setImmediate(() => send(inserted.insertId).catch(() => {}));
  } catch { /* marketing must never break an order */ }
}

// Status changes do not create extra Meta events: a COD order is counted once, when it is placed.
async function queueStatusEvent() {}

async function retryFailed() {
  const [rows] = await pool.query("SELECT id FROM capi_events WHERE status IN ('pending','failed') AND attempts < 5 AND created_at > DATE_SUB(NOW(), INTERVAL 2 DAY) ORDER BY id LIMIT 50");
  for (const { id } of rows) await send(id);
  return rows.length;
}

module.exports = { queuePurchase, queueStatusEvent, retryFailed };
