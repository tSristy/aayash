'use strict';

const express = require('express');
const { requireAdmin } = require('../../../auth/session');
const { requireCatalogWriteOrigin } = require('../../../middleware/catalog-origin');
const couriers = require('../../../controllers/courier/CourierController');
const risk = require('../../../controllers/risk/CustomerRiskController');

const router = express.Router();

router.use(requireAdmin('super_admin'));
router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.get('/providers', couriers.listProviders);
router.get('/providers/options', couriers.providerOptions);
router.get('/providers/:id', couriers.getProvider);
router.post('/providers', requireCatalogWriteOrigin, couriers.createProvider);
router.post('/providers/:id/archive', requireCatalogWriteOrigin, couriers.archiveProvider);
router.post('/providers/:id/restore', requireCatalogWriteOrigin, couriers.restoreProvider);
router.get('/shipments', couriers.listShipments);
router.patch('/providers/:id', requireCatalogWriteOrigin, couriers.updateProvider);
router.get('/orders/:orderId/shipments', couriers.getOrderShipments);
router.post('/orders/:orderId/shipments', requireCatalogWriteOrigin, couriers.createManualShipment);
router.patch('/shipments/:id/status', requireCatalogWriteOrigin, couriers.changeShipmentStatus);
router.get('/orders/:orderId/risk', risk.orderHistory);

module.exports = router;
