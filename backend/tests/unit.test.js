'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
process.env.SETTINGS_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
const { canMove, TRANSITIONS, STATUSES } = require('../src/services/orders/workflow');
const { encrypt, decrypt } = require('../src/lib/secrets');
const { coerce } = require('../src/lib/crud');
const { dateOnly, money, HttpError } = require('../src/lib/http');
const { ALL_PERMISSIONS, ROLE_TEMPLATES } = require('../src/auth/permissions');
const { SETTINGS } = require('../src/services/settings');

test('workflow: every status has transitions and all targets exist', () => {
  for (const status of STATUSES) assert.ok(TRANSITIONS[status], status);
  for (const [from, list] of Object.entries(TRANSITIONS)) for (const to of list) assert.ok(STATUSES.includes(to), `${from}->${to}`);
});

test('workflow: forward path allowed, shortcuts and reversals refused', () => {
  assert.ok(canMove('placed', 'confirmed'));
  assert.ok(canMove('confirmed', 'packed'));
  assert.ok(canMove('packed', 'out_for_delivery'));
  assert.ok(canMove('out_for_delivery', 'delivered'));
  assert.ok(!canMove('placed', 'delivered'));
  assert.ok(!canMove('delivered', 'cancelled'));
  assert.ok(!canMove('cancelled', 'placed'));
  assert.ok(!canMove('returned', 'delivered'));
});

test('secrets: round trip, tamper detection, unique IV', () => {
  const a = encrypt('super-secret'); const b = encrypt('super-secret');
  assert.notEqual(a, b);
  assert.equal(decrypt(a), 'super-secret');
  const parts = a.split('.'); parts[3] = parts[3].replace(/.$/, (c) => (c === '0' ? '1' : '0'));
  assert.equal(decrypt(parts.join('.')), '');
  assert.equal(decrypt(''), '');
});

test('crud coerce: required, enum, int, bool, pattern', () => {
  assert.throws(() => coerce({ name: 'x', required: true }, ''), /required/);
  assert.equal(coerce({ name: 'x', type: 'bool' }, 'true'), 1);
  assert.equal(coerce({ name: 'x', type: 'int', min: 0 }, '5'), 5);
  assert.throws(() => coerce({ name: 'x', type: 'int', min: 0 }, '-1'), /invalid/);
  assert.throws(() => coerce({ name: 'x', type: 'enum', values: ['a'] }, 'b'), /invalid/);
  assert.throws(() => coerce({ name: 'x', pattern: /^[a-z]+$/ }, 'ABC'), /invalid/);
  assert.equal(coerce({ name: 'x', type: 'num' }, '10.456'), 10.46);
});

test('validators: dateOnly and money', () => {
  assert.equal(dateOnly('2026-02-28'), '2026-02-28');
  assert.throws(() => dateOnly('2026-02-30'), HttpError);
  assert.throws(() => dateOnly(''), /required/);
  assert.equal(money('12.345'), 12.35);
  assert.throws(() => money('-1'), HttpError);
  assert.throws(() => money('0', 'A', { allowZero: false }), HttpError);
});

test('permissions: templates only use known codes; secrets never public', () => {
  for (const t of Object.values(ROLE_TEMPLATES)) for (const p of t.permissions) assert.ok(ALL_PERMISSIONS.includes(p), p);
  for (const [key, def] of Object.entries(SETTINGS)) if (def.secret) assert.ok(!def.public, key);
});
