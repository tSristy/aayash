'use strict';

const express = require('express');
const { requireAdmin } = require('../../auth/session');
const { requireCatalogWriteOrigin } = require('../../middleware/catalog-origin');
const orders = require('../../controllers/orders/OrderController');

const router = express.Router();
router.use(requireAdmin('super_admin'));
router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.get('/', orders.listOrders);
router.patch('/:id/status', requireCatalogWriteOrigin, orders.changeOrderStatus);
router.get('/:id', orders.getOrderDetail);

module.exports = router;
