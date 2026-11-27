'use strict';

const { CourierApiError, resolveBase, request, safeEqual } = require('./base');

const HOSTS = { live: 'https://portal.packzy.com/api/v1', sandbox: 'https://portal.packzy.com/api/v1' };

// Steadfast delivery_status -> internal shipment status
const STATUS_MAP = {
  pending: 'booked', in_review: 'booked', hold: 'booked', unknown: 'booked', unknown_approval_pending: 'booked',
  delivered_approval_pending: 'delivered', delivered: 'delivered',
  partial_delivered_approval_pending: 'delivered', partial_delivered: 'delivered',
  cancelled_approval_pending: 'returning', cancelled: 'returned',
};

class SteadfastAdapter {
  static label = 'Steadfast Courier';
  static credentialFields = [
    { key: 'api_key', label: 'API key', secret: true },
    { key: 'secret_key', label: 'Secret key', secret: true },
    { key: 'webhook_token', label: 'Webhook bearer token (optional)', secret: true },
  ];

  headers(c) { return { 'Api-Key': c.api_key, 'Secret-Key': c.secret_key }; }
  base(c, mode) { return resolveBase(HOSTS, c, mode); }

  mapStatus(providerStatus) {
    const key = String(providerStatus || '').toLowerCase();
    return { status: STATUS_MAP[key] || 'booked', partial: key.startsWith('partial_delivered') };
  }

  async test(c, mode) {
    const data = await request(`${this.base(c, mode)}/get_balance`, { headers: this.headers(c) });
    return { ok: true, detail: data.current_balance !== undefined ? `Connected. Balance: ৳${data.current_balance}` : 'Connected.' };
  }

  async book(c, mode, { order, codAmount, note }) {
    const phone = String(order.guest_phone || '').replace(/\D/g, '').slice(-11);
    const data = await request(`${this.base(c, mode)}/create_order`, {
      method: 'POST', headers: this.headers(c),
      body: {
        invoice: order.order_no, recipient_name: order.guest_name, recipient_phone: phone,
        recipient_address: [order.address_line, order.area, order.city].filter(Boolean).join(', ').slice(0, 250),
        cod_amount: Number(codAmount), note: note || undefined,
      },
    });
    const consignment = data.consignment;
    if (!consignment?.consignment_id) throw new CourierApiError('Steadfast did not return a consignment ID.');
    return {
      consignmentId: String(consignment.consignment_id),
      trackingUrl: consignment.tracking_code ? `https://steadfast.com.bd/t/${consignment.tracking_code}` : null,
      providerStatus: consignment.status || 'pending',
    };
  }

  async fetchStatus(c, mode, shipment) {
    const data = await request(`${this.base(c, mode)}/status_by_cid/${encodeURIComponent(shipment.consignment_id)}`, { headers: this.headers(c) });
    return { providerStatus: data.delivery_status || 'unknown' };
  }

  // Steadfast posts JSON with `Authorization: Bearer <token>` if you configured one in its portal.
  parseWebhook(c, headers, body) {
    if (c.webhook_token) {
      const auth = String(headers.authorization || '').replace(/^Bearer\s+/i, '');
      if (!safeEqual(auth, c.webhook_token)) return { error: 'unauthorized' };
    } else return { error: 'webhook token not configured' };
    if (!body || !body.consignment_id) return { error: 'ignored' };
    const providerStatus = body.status || body.delivery_status;
    if (!providerStatus) return { error: 'ignored' };
    return { consignmentId: String(body.consignment_id), providerStatus, eventType: body.notification_type || 'delivery_status', eventKey: `${body.consignment_id}:${providerStatus}:${body.updated_at || ''}` };
  }
}

module.exports = SteadfastAdapter;
