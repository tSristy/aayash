'use strict';

const crypto = require('node:crypto');

// AES-256-GCM for credentials stored in the database (courier keys, OAuth
// secrets, Meta access token). Set SETTINGS_ENCRYPTION_KEY (64 hex chars) in .env.
function key() {
  const hex = process.env.SETTINGS_ENCRYPTION_KEY || '';
  if (/^[0-9a-f]{64}$/i.test(hex)) return Buffer.from(hex, 'hex');
  if (process.env.NODE_ENV === 'production') {
    throw new Error('SETTINGS_ENCRYPTION_KEY (64 hex characters) is required in production.');
  }
  // Development convenience only: a fixed derived key so local credentials survive restarts.
  return crypto.scryptSync('aayash-dev-only-key', 'aayash-salt', 32);
}

function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
  return `v1.${iv.toString('hex')}.${cipher.getAuthTag().toString('hex')}.${data.toString('hex')}`;
}

function decrypt(payload) {
  if (!payload) return '';
  const [version, iv, tag, data] = String(payload).split('.');
  if (version !== 'v1' || !iv || !tag || !data) return '';
  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'hex'));
    decipher.setAuthTag(Buffer.from(tag, 'hex'));
    return Buffer.concat([decipher.update(Buffer.from(data, 'hex')), decipher.final()]).toString('utf8');
  } catch {
    return '';
  }
}

const mask = (value) => (value ? '••••••••' : '');

module.exports = { encrypt, decrypt, mask };
