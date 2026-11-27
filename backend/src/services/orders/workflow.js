'use strict';

// Admin tab name -> database status. "Incomplete" comes from checkout_drafts.
const STATUS_LABELS = Object.freeze({
  placed: 'New',
  pending: 'Pending',
  confirmed: 'Approved',
  wfp: 'WFP',
  packaging: 'Packaging',
  packed: 'Ready to shipment',
  out_for_delivery: 'Shipment',
  partial_delivered: 'Partial Delivered',
  delivered: 'Delivered',
  return_pending: 'Return Pending',
  returned: 'Return',
  cancelled: 'Cancel',
});

const STATUSES = Object.freeze(Object.keys(STATUS_LABELS));

const TRANSITIONS = Object.freeze({
  placed: ['pending', 'confirmed', 'cancelled'],
  pending: ['confirmed', 'wfp', 'cancelled'],
  wfp: ['pending', 'confirmed', 'cancelled'],
  confirmed: ['pending', 'wfp', 'packaging', 'packed', 'cancelled'],
  packaging: ['packed', 'cancelled'],
  packed: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered', 'partial_delivered', 'return_pending', 'cancelled'],
  partial_delivered: ['return_pending'],
  delivered: ['return_pending'],
  return_pending: ['returned', 'delivered'],
  returned: [],
  cancelled: [],
});

// States in which the customer, items and totals may still be edited.
const EDITABLE = Object.freeze(['placed', 'pending', 'wfp', 'confirmed', 'packaging']);
const COURIER_BOOKABLE = Object.freeze(['confirmed', 'packaging', 'packed', 'out_for_delivery']);

const canMove = (from, to) => (TRANSITIONS[from] || []).includes(to);

module.exports = { STATUS_LABELS, STATUSES, TRANSITIONS, EDITABLE, COURIER_BOOKABLE, canMove };
