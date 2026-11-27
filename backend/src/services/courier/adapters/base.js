'use strict';

const crypto = require('node:crypto');

class CourierApiError extends Error {
  constructor(message, { status = 502, retryable = false } = {}) {
    super(message);
    this.status = status;
    this.retryable = retryable;
  }
}

// Hosts are fixed per mode. A base_url override exists only for automated tests
// (COURIER_ALLOW_BASE_URL_OVERRIDE=1), so an admin can never aim a request at an internal address.
function resolveBase(hosts, creds, mode) {
  if (process.env.COURIER_ALLOW_BASE_URL_OVERRIDE === '1' && creds.base_url) return String(creds.base_url).replace(/\/$/, '');
  return hosts[mode === 'sandbox' ? 'sandbox' : 'live'];
}

async function request(url, { method = 'GET', headers = {}, body, timeoutMs = 20000 } = {}) {
  let response;
  try {
    response = await fetch(url, {
      method, headers: { Accept: 'application/json', ...(body ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    throw new CourierApiError(`Could not reach the courier (${error.name === 'TimeoutError' ? 'timed out' : 'network error'}).`, { retryable: true });
  }
  const raw = await response.text();
  let data = null;
  try { data = raw ? JSON.parse(raw) : null; } catch { data = null; }
  if (!response.ok) {
    const message = data?.message || data?.error || data?.errors && JSON.stringify(data.errors).slice(0, 200) || `HTTP ${response.status}`;
    throw new CourierApiError(`Courier rejected the request: ${String(message).slice(0, 250)}`, { status: response.status === 401 || response.status === 403 ? 401 : 502, retryable: response.status >= 500 || response.status === 429 });
  }
  return data || {};
}

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
};

module.exports = { CourierApiError, resolveBase, request, safeEqual };
