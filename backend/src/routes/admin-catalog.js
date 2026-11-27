'use strict';

const express = require('express');

const { requirePermission } = require('../auth/access');
const catalogOverview = require('../controllers/catalog/CatalogOverviewController');
const dashboardController = require('../controllers/catalog/DashboardController');
const productTypeRoutes = require('./admin/catalog/ProductTypeRoutes');
const attributeRoutes = require('./admin/catalog/AttributeDefinitionRoutes');
const productRoutes = require('./admin/catalog/ProductRoutes');
const categoryRoutes = require('./admin/catalog/CategoryRoutes');
const brandRoutes = require('./admin/catalog/BrandRoutes');
const mediaRoutes = require('./admin/media/MediaRoutes');

const router = express.Router();

// Catalog and media operations require a signed-in admin holding the matching permission.
router.use((req, res, next) => {
  const readOnly = req.method === 'GET' || req.method === 'HEAD';
  const codes = readOnly
    ? ['products.view', 'products.manage', 'stock.view', 'combos.manage', 'website.manage', 'orders.view', 'purchases.manage', 'marketing.manage']
    : ['products.manage', 'website.manage'];
  return requirePermission(...codes)(req, res, next);
});

router.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

router.get('/overview', catalogOverview.overview);
router.get('/dashboard', dashboardController.dashboard);
router.use('/product-types', productTypeRoutes);
router.use('/attributes', attributeRoutes);
router.use('/products', productRoutes);
router.use('/categories', categoryRoutes);
router.use('/brands', brandRoutes);
router.use('/media', mediaRoutes);

module.exports = router;
