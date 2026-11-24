'use strict';

/**
 * The store does not preselect a courier company.
 *
 * Admin-created courier masters work immediately for manual shipments.
 * Provider adapters are registered only after the client selects a company,
 * supplies approved API docs, and the integration passes real tests.
 *
 * Never store or expose API secrets in this registry.
 */
const registry = new Map();

function registerProviderAdapter(code, Adapter) {
  if (typeof code !== 'string' || !/^[a-z][a-z0-9-]{1,39}$/.test(code)) {
    throw new TypeError('Invalid courier provider code.');
  }
  if (typeof Adapter !== 'function') {
    throw new TypeError('Courier API adapter must be a constructor.');
  }
  if (registry.has(code)) {
    throw new Error(`Courier API adapter already registered: ${code}`);
  }
  registry.set(code, Adapter);
}

function getProviderAdapter(code) {
  const Adapter = registry.get(code);
  if (!Adapter) {
    throw new Error('Courier API integration is not configured. Use Manual Booking.');
  }
  return new Adapter();
}

function supportedProviders() {
  return Array.from(registry.keys());
}

module.exports = {
  registerProviderAdapter,
  getProviderAdapter,
  supportedProviders,
};
