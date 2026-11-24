'use strict';

const { normalizePhone } = require('../orders/order-policy');

function phoneVariants(raw) {
  const local = normalizePhone(raw);
  if (!local) {
    return [];
  }

  const international = `880${local.slice(1)}`;
  return [local, international, `+${international}`];
}

function summarizeHistory(rows) {
  const totalOrders = Number(rows.total_orders || 0);
  const deliveredOrders = Number(rows.delivered_orders || 0);
  const cancelledOrders = Number(rows.cancelled_orders || 0);
  const finishedOrders = deliveredOrders + cancelledOrders;

  return {
    totalOrders,
    deliveredOrders,
    cancelledOrders,
    inProgressOrders: Math.max(0, totalOrders - finishedOrders),
    observedDeliveryRate: finishedOrders
      ? Math.round((deliveredOrders / finishedOrders) * 1000) / 10
      : null,
    assessment: finishedOrders < 3 ? 'insufficient_history' : 'manual_review',
    note: 'Cancellation reasons and courier returns are not equivalent. Do not automatically reject customers.',
    externalCourierHistory: {
      status: 'not_connected',
      sources: [],
    },
  };
}

module.exports = { phoneVariants, summarizeHistory };
