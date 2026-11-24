'use strict';

const express = require('express');

const { requireAdmin } = require('../auth/session');
const catalogOverview = require('../controllers/catalog/CatalogOverviewController');
const dashboardController = require('../controllers/catalog/DashboardController');
const productTypeRoutes = require('./admin/catalog/ProductTypeRoutes');
const attributeRoutes = require('./admin/catalog/AttributeDefinitionRoutes');
const productRoutes = require('./admin/catalog/ProductRoutes');
const categoryRoutes = require('./admin/catalog/CategoryRoutes');
const brandRoutes = require('./admin/catalog/BrandRoutes');
const mediaRoutes = require('./admin/media/MediaRoutes');

const router = express.Router();

// All catalog and media operations require a valid Super Admin session.
router.use(requireAdmin('super_admin'));

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
