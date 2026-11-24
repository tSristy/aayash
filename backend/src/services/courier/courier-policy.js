'use strict';

const SHIPMENT_STATUSES = [
  'booked',
  'picked_up',
  'in_transit',
  'delivered',
  'returning',
  'returned',
  'cancelled',
];

const STATUS_TRANSITIONS = Object.freeze({
  booked: ['picked_up', 'cancelled'],
  picked_up: ['in_transit', 'returning'],
  in_transit: ['delivered', 'returning'],
  returning: ['returned'],
  delivered: [],
  returned: [],
  cancelled: [],
});

const ACTIVE_SHIPMENT_STATUSES = [
  'booked',
  'picked_up',
  'in_transit',
  'returning',
];

function canTransition(from, to) {
  return Boolean(STATUS_TRANSITIONS[from]?.includes(to));
}

function normalizeConsignment(value) {
  const text = String(value || '').trim();
  return /^[A-Za-z0-9_\-/]{4,120}$/.test(text) ? text : null;
}

function validWeight(value) {
  if (value === '' || value === null || value === undefined) {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) && number > 0 && number <= 100
    ? Math.round(number * 1000) / 1000
    : undefined;
}

module.exports = {
  SHIPMENT_STATUSES,
  ACTIVE_SHIPMENT_STATUSES,
  canTransition,
  normalizeConsignment,
  validWeight,
};
