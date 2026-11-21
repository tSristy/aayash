'use strict';
const { randomBytes, scrypt, timingSafeEqual } = require('node:crypto');
const { promisify } = require('node:util');
const scryptAsync = promisify(scrypt);
const N = 32768, r = 8, p = 1;
const MIN_PASSWORD_LENGTH = 5;
const options = { N, r, p, maxmem: 64 * 1024 * 1024 };

async function hashPassword(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH || password.length > 128) {
    throw new Error(`Password must be ${MIN_PASSWORD_LENGTH} to 128 characters long.`);
  }
  const salt = randomBytes(32);
  const result = await scryptAsync(password, salt, 64, options);
  return `scrypt$${N}$${r}$${p}$${salt.toString('hex')}$${result.toString('hex')}`;
}

async function verifyPassword(password, encoded) {
  try {
    if (typeof password !== 'string' || password.length > 128) return false;
    const [alg, n, rValue, pValue, saltHex, hashHex, extra] = encoded.split('$');
    if (extra !== undefined || alg !== 'scrypt' || +n !== N || +rValue !== r || +pValue !== p ||
        !/^[0-9a-f]{64}$/.test(saltHex) || !/^[0-9a-f]{128}$/.test(hashHex)) return false;
    const expected = Buffer.from(hashHex, 'hex');
    const actual = await scryptAsync(password, Buffer.from(saltHex, 'hex'), expected.length, options);
    return timingSafeEqual(actual, expected);
  } catch { return false; }
}
module.exports = { hashPassword, verifyPassword, MIN_PASSWORD_LENGTH };
