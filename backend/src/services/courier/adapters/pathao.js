'use strict';

const { CourierApiError, resolveBase, request, safeEqual } = require('./base');

const HOSTS = { live: 'https://api-hermes.pathao.com', sandbox: 'https://courier-api-sandbox.pathao.com' };

const STATUS_MAP = {
  pending: 'booked', 'pickup requested': 'booked', 'pickup assigned': 'booked', 'pickup failed': 'booked', 'pickup cancelled': 'cancelled',
  'at the sorting hub': 'in_transit', 'in transit': 'in_transit', 'received at last mile hub': 'in_transit', 'assigned for delivery': 'in_transit', picked: 'picked_up', pickup: 'picked_up',
  delivered: 'delivered', 'partial delivery': 'delivered', 'payment invoice': 'delivered',
  return: 'returning', 'return in transit': 'returning', 'returned to merchant': 'returned', 'exchange': 'returning', 'delivery failed': 'returning', 'on hold': 'in_transit',
};

class PathaoAdapter {
  static label = 'Pathao Courier';
  static credentialFields = [
    { key: 'client_id', label: 'Client ID', secret: false },
    { key: 'client_secret', label: 'Client secret', secret: true },
    { key: 'username', label: 'Merchant email', secret: false },
    { key: 'password', label: 'Merchant password', secret: true },
    { key: 'store_id', label: 'Store ID', secret: false },
    { key: 'webhook_secret', label: 'Webhook secret (optional)', secret: true },
  ];

  base(c, mode) { return resolveBase(HOSTS, c, mode); }

  async token(c, mode) {
    const data = await request(`${this.base(c, mode)}/aladdin/api/v1/issue-token`, {
      method: 'POST', body: { client_id: c.client_id, client_secret: c.client_secret, username: c.username, password: c.password, grant_type: 'password' },
    });
    if (!data.access_token) throw new CourierApiError('Pathao did not issue an access token. Check the credentials.', { status: 401 });
    return data.access_token;
  }

  mapStatus(providerStatus) {
    const key = String(providerStatus || '').replace(/_/g, ' ').toLowerCase();
    return { status: STATUS_MAP[key] || 'in_transit', partial: key === 'partial delivery' };
  }

  async test(c, mode) {
    const token = await this.token(c, mode);
    const stores = await request(`${this.base(c, mode)}/aladdin/api/v1/stores`, { headers: { Authorization: `Bearer ${token}` } });
    const count = stores?.data?.data?.length ?? 0;
    return { ok: true, detail: `Connected. ${count} pickup store(s) found.` };
  }

  async book(c, mode, { order, codAmount, note, weightKg, itemCount, description }) {
    if (!c.store_id) throw new CourierApiError('Set the Pathao Store ID first.', { status: 400 });
    const token = await this.token(c, mode);
    const data = await request(`${this.base(c, mode)}/aladdin/api/v1/orders`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}` },
      body: {
        store_id: Number(c.store_id), merchant_order_id: order.order_no, recipient_name: order.guest_name,
        recipient_phone: String(order.guest_phone || '').replace(/\D/g, '').slice(-11),
        recipient_address: [order.address_line, order.area, order.city].filter(Boolean).join(', ').slice(0, 250),
        delivery_type: 48, item_type: 2, item_quantity: Math.max(1, Number(itemCount) || 1),
        item_weight: Math.max(0.5, Number(weightKg) || 0.5), amount_to_collect: Math.round(Number(codAmount)),
        item_description: description ? String(description).slice(0, 200) : undefined, special_instruction: note || undefined,
      },
    });
    const info = data.data;
    if (!info?.consignment_id) throw new CourierApiError('Pathao did not return a consignment ID.');
    return { consignmentId: String(info.consignment_id), trackingUrl: null, providerStatus: info.order_status || 'Pending' };
  }

  async fetchStatus(c, mode, shipment) {
    const token = await this.token(c, mode);
    const data = await request(`${this.base(c, mode)}/aladdin/api/v1/orders/${encodeURIComponent(shipment.consignment_id)}/info`, { headers: { Authorization: `Bearer ${token}` } });
    return { providerStatus: data?.data?.order_status || 'Pending' };
  }

  parseWebhook(c, headers, body) {
    if (!c.webhook_secret) return { error: 'webhook secret not configured' };
    const sent = headers['x-pathao-signature'] || String(headers.authorization || '').replace(/^Bearer\s+/i, '');
    if (!safeEqual(sent, c.webhook_secret)) return { error: 'unauthorized' };
    const consignmentId = body?.consignment_id;
    const providerStatus = body?.order_status || body?.event;
    if (!consignmentId || !providerStatus) return { error: 'ignored' };
    return { consignmentId: String(consignmentId), providerStatus: String(providerStatus).replace(/^order\./, ''), eventType: body.event || 'status', eventKey: `${consignmentId}:${providerStatus}:${body.updated_at || ''}` };
  }
}

module.exports = PathaoAdapter;
