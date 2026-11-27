'use strict';

const { registerProviderAdapter, supportedProviders } = require('../provider-adapters');

// Register the built-in API integrations once. Providers still work in manual mode without credentials.
function registerBuiltIns() {
  const adapters = { steadfast: require('./steadfast'), pathao: require('./pathao'), redx: require('./redx') };
  for (const [code, Adapter] of Object.entries(adapters)) {
    if (!supportedProviders().includes(code)) registerProviderAdapter(code, Adapter);
  }
}

module.exports = { registerBuiltIns };
