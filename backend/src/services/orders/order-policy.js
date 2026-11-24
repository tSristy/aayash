'use strict';

const { createHash, timingSafeEqual } = require('node:crypto');

const DELIVERY_PRICES = Object.freeze({
  inside_dhaka: 70,
  outside_dhaka: 120,
});

// This is a district selector for the MVP. 'Dhaka' means delivery inside
// Dhaka city only; outlying Dhaka District locations need an explicit zone
// verification before enabling automated courier pricing.
const CITIES = Object.freeze([
  'Bagerhat', 'Bandarban', 'Barguna', 'Barishal', 'Bhola',
  'Bogura', 'Brahmanbaria', 'Chandpur', 'Chapainawabganj',
  'Chattogram', 'Chuadanga', 'Coxs Bazar', 'Cumilla', 'Dhaka',
  'Dinajpur', 'Faridpur', 'Feni', 'Gaibandha', 'Gazipur',
  'Gopalganj', 'Habiganj', 'Jamalpur', 'Jashore', 'Jhalokati',
  'Jhenaidah', 'Joypurhat', 'Khagrachhari', 'Khulna',
  'Kishoreganj', 'Kurigram', 'Kushtia', 'Lakshmipur',
  'Lalmonirhat', 'Madaripur', 'Magura', 'Manikganj',
  'Meherpur', 'Moulvibazar', 'Munshiganj', 'Mymensingh',
  'Naogaon', 'Narail', 'Narayanganj', 'Narsingdi', 'Natore',
  'Netrokona', 'Nilphamari', 'Noakhali', 'Pabna',
  'Panchagarh', 'Patuakhali', 'Pirojpur', 'Rajbari',
  'Rajshahi', 'Rangamati', 'Rangpur', 'Satkhira',
  'Shariatpur', 'Sherpur', 'Sirajganj', 'Sunamganj',
  'Sylhet', 'Tangail', 'Thakurgaon',
]);

const STATUS_TRANSITIONS = Object.freeze({
  placed: ['confirmed', 'cancelled'],
  confirmed: ['packed', 'cancelled'],
  packed: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered'],
  delivered: [],
  cancelled: [],
});

function normalizePhone(phone) {
  const digits = String(phone || '').replace(/[\s()+-]/g, '');
  const local = digits.startsWith('880') ? `0${digits.slice(3)}` : digits;
  return /^01[3-9]\d{8}$/.test(local) ? local : null;
}

function shippingForCity(city) {
  const normalized = CITIES.find((entry) => (
    entry.toLowerCase() === String(city || '').trim().toLowerCase()
  ));

  if (!normalized) {
    return null;
  }

  const zone = normalized === 'Dhaka' ? 'inside_dhaka' : 'outside_dhaka';

  return {
    city: normalized,
    zone,
    fee: DELIVERY_PRICES[zone],
  };
}

function hashTrackingCode(code) {
  return createHash('sha256').update(code).digest('hex');
}

function validTrackingCode(code) {
  return typeof code === 'string' && /^[a-f0-9]{64}$/.test(code);
}

function trackingCodeMatches(code, hash) {
  if (!validTrackingCode(code) || !/^[a-f0-9]{64}$/.test(hash || '')) {
    return false;
  }

  return timingSafeEqual(
    Buffer.from(hashTrackingCode(code), 'hex'),
    Buffer.from(hash, 'hex')
  );
}

function canChangeStatus(from, to) {
  return (STATUS_TRANSITIONS[from] || []).includes(to);
}

module.exports = {
  CITIES,
  DELIVERY_PRICES,
  STATUS_TRANSITIONS,
  normalizePhone,
  shippingForCity,
  hashTrackingCode,
  validTrackingCode,
  trackingCodeMatches,
  canChangeStatus,
};
