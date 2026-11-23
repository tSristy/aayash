'use strict';

const { randomBytes } = require('node:crypto');

// Crockford-like alphabet avoids ambiguous 0/O and 1/I characters.
// 12 characters supply 60 bits of random order-reference entropy.
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const PUBLIC_ORDER_PATTERN = /^AY-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}-[2-9A-HJ-NP-Z]{4}$/;

function createPublicOrderNumber() {
  let entropy = randomBytes(8).readBigUInt64BE(0) & ((1n << 60n) - 1n);
  let encoded = '';

  for (let index = 0; index < 12; index += 1) {
    const digit = Number(entropy & 31n);
    encoded = ALPHABET[digit] + encoded;
    entropy >>= 5n;
  }

  return `AY-${encoded.slice(0, 4)}-${encoded.slice(4, 8)}-${encoded.slice(8, 12)}`;
}

function isPublicOrderNumber(value) {
  return typeof value === 'string' && PUBLIC_ORDER_PATTERN.test(value);
}

function maskCustomerName(value) {
  const name = String(value || '').trim();
  if (!name) return 'Customer';

  return name.split(/\s+/).map((part) => (
    part.length === 1 ? '*' : `${part[0]}${'*'.repeat(Math.min(part.length - 1, 4))}`
  )).join(' ');
}

function maskCustomerPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length < 7) return 'Hidden';
  return `${digits.slice(0, 3)}*****${digits.slice(-3)}`;
}

module.exports = {
  createPublicOrderNumber,
  isPublicOrderNumber,
  maskCustomerName,
  maskCustomerPhone,
};
