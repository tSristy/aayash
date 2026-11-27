'use strict';

const express = require('express');
const { requirePermission } = require('../../../auth/access');
const { requireCatalogWriteOrigin } = require('../../../middleware/catalog-origin');
const couriers = require('../../../controllers/courier/CourierController');
const risk = require('../../../controllers/risk/CustomerRiskController');
const api = require('../../../controllers/courier/CourierApiController');

const router = express.Router();

const read = requirePermission('orders.view', 'orders.manage', 'couriers.manage');
const ship = requirePermission('orders.manage', 'couriers.manage');
const master = requirePermission('couriers.manage');
router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.get('/providers', read, couriers.listProviders);
router.get('/providers/options', read, couriers.providerOptions);
router.get('/providers/:id', read, couriers.getProvider);
router.post('/providers', master, requireCatalogWriteOrigin, couriers.createProvider);
router.post('/providers/:id/archive', master, requireCatalogWriteOrigin, couriers.archiveProvider);
router.post('/providers/:id/restore', master, requireCatalogWriteOrigin, couriers.restoreProvider);
router.get('/shipments', read, couriers.listShipments);
router.patch('/providers/:id', master, requireCatalogWriteOrigin, couriers.updateProvider);
router.get('/orders/:orderId/shipments', read, couriers.getOrderShipments);
router.post('/orders/:orderId/shipments', ship, requireCatalogWriteOrigin, couriers.createManualShipment);
router.patch('/shipments/:id/status', ship, requireCatalogWriteOrigin, couriers.changeShipmentStatus);
router.get('/orders/:orderId/risk', read, risk.orderHistory);

router.get('/providers/:id/api', master, api.getApiSettings);
router.put('/providers/:id/api', master, requireCatalogWriteOrigin, api.saveApiSettings);
router.post('/providers/:id/api/test', master, requireCatalogWriteOrigin, api.testApi);
router.post('/orders/:orderId/book-api', ship, requireCatalogWriteOrigin, api.bookViaApi);
router.post('/shipments/:id/sync', ship, requireCatalogWriteOrigin, api.syncShipment);

module.exports = router;
