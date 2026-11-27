'use strict';

const { CourierApiError, resolveBase, request, safeEqual } = require('./base');

const HOSTS = { live: 'https://openapi.redx.com.bd/v1.0.0-beta', sandbox: 'https://sandbox.redx.com.bd/v1.0.0-beta' };

const STATUS_MAP = {
  'ready-for-delivery': 'booked', 'pickup-pending': 'booked', 'agent-hold': 'in_transit', 'agent-area-change': 'in_transit',
  'delivery-in-progress': 'in_transit', 'in-transit': 'in_transit', 'picked-up': 'picked_up',
  delivered: 'delivered', 'agent-returning': 'returning', returning: 'returning', returned: 'returned', cancelled: 'cancelled',
};

class RedxAdapter {
  static label = 'RedX';
  static credentialFields = [
    { key: 'access_token', label: 'API access token', secret: true },
    { key: 'pickup_store_id', label: 'Pickup store ID (optional)', secret: false },
    { key: 'default_area_id', label: 'Default delivery area ID (optional)', secret: false },
    { key: 'webhook_token', label: 'Webhook token (optional)', secret: true },
  ];

  headers(c) { return { 'API-ACCESS-TOKEN': `Bearer ${c.access_token}` }; }
  base(c, mode) { return resolveBase(HOSTS, c, mode); }

  mapStatus(providerStatus) {
    const key = String(providerStatus || '').toLowerCase().replace(/_/g, '-');
    return { status: STATUS_MAP[key] || 'in_transit', partial: false };
  }

  async test(c, mode) {
    const data = await request(`${this.base(c, mode)}/areas`, { headers: this.headers(c) });
    return { ok: true, detail: `Connected. ${data.areas?.length ?? 0} delivery areas available.` };
  }

  // RedX needs a delivery area ID. Match the order's area/city to RedX's list; fall back to the configured default.
  async resolveArea(c, mode, order) {
    const data = await request(`${this.base(c, mode)}/areas`, { headers: this.headers(c) });
    const areas = data.areas || [];
    const needles = [order.area, order.city].filter(Boolean).map((s) => String(s).toLowerCase());
    for (const needle of needles) {
      const hit = areas.find((a) => String(a.name || '').toLowerCase() === needle) || areas.find((a) => String(a.name || '').toLowerCase().includes(needle));
      if (hit) return { id: hit.id, name: hit.name };
    }
    if (c.default_area_id) {
      const hit = areas.find((a) => String(a.id) === String(c.default_area_id));
      return { id: Number(c.default_area_id), name: hit?.name || order.city };
    }
    throw new CourierApiError('RedX could not match this address to a delivery area. Set a default area ID or book manually.', { status: 400 });
  }

  async book(c, mode, { order, codAmount, note, weightKg, description }) {
    const area = await this.resolveArea(c, mode, order);
    const data = await request(`${this.base(c, mode)}/parcel`, {
      method: 'POST', headers: this.headers(c),
      body: {
        customer_name: order.guest_name, customer_phone: String(order.guest_phone || '').replace(/\D/g, '').slice(-11),
        delivery_area: area.name, delivery_area_id: Number(area.id), customer_address: [order.address_line, order.area, order.city].filter(Boolean).join(', ').slice(0, 250),
        merchant_invoice_id: order.order_no, cash_collection_amount: String(Math.round(Number(codAmount))),
        parcel_weight: Math.max(100, Math.round((Number(weightKg) || 0.5) * 1000)), instruction: note || '', value: Math.max(1, Math.round(Number(order.total))),
        ...(c.pickup_store_id ? { pickup_store_id: Number(c.pickup_store_id) } : {}), ...(description ? { parcel_details_json: [{ name: String(description).slice(0, 100), category: 'general', value: Math.round(Number(order.total)) }] } : {}),
      },
    });
    if (!data.tracking_id) throw new CourierApiError('RedX did not return a tracking ID.');
    return { consignmentId: String(data.tracking_id), trackingUrl: `https://redx.com.bd/track-global-parcel/?trackingId=${encodeURIComponent(data.tracking_id)}`, providerStatus: 'ready-for-delivery' };
  }

  async fetchStatus(c, mode, shipment) {
    const data = await request(`${this.base(c, mode)}/parcel/track/${encodeURIComponent(shipment.consignment_id)}`, { headers: this.headers(c) });
    const events = data.tracking || [];
    const latest = events[events.length - 1] || events[0];
    return { providerStatus: latest?.message_en || latest?.status || 'in-transit' };
  }

  parseWebhook(c, headers, body) {
    if (!c.webhook_token) return { error: 'webhook token not configured' };
    const sent = String(headers.authorization || '').replace(/^Bearer\s+/i, '') || headers['x-webhook-token'];
    if (!safeEqual(sent, c.webhook_token)) return { error: 'unauthorized' };
    const consignmentId = body?.tracking_number || body?.tracking_id;
    const providerStatus = body?.status;
    if (!consignmentId || !providerStatus) return { error: 'ignored' };
    return { consignmentId: String(consignmentId), providerStatus, eventType: 'status', eventKey: `${consignmentId}:${providerStatus}:${body.timestamp || ''}` };
  }
}

module.exports = RedxAdapter;
