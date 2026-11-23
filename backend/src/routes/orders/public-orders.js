'use strict';

const express = require('express');
const { publicRateLimit } = require('../../middleware/public-rate-limit');
const orders = require('../../controllers/orders/OrderController');

const router = express.Router();

router.post('/', publicRateLimit({ max: 8 }), orders.createOrder);
router.post('/track', publicRateLimit({ max: 12 }), orders.trackOrder);

// Remove the legacy, privacy-violating phone-only search endpoint.
router.get('/', (_req, res) => {
  res.set('Cache-Control', 'no-store');
  res.status(410).json({
    error: 'Phone-only order lookup is discontinued. Use your order number.',
  });
});

module.exports = router;
