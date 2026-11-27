'use strict';

const express = require('express');
const catalog = require('../../controllers/public/CatalogController');

const router = express.Router();
router.get('/categories', catalog.categories);
router.get('/brands', catalog.brands);
router.get('/products', catalog.products);
router.get('/products/:slug', catalog.productDetails);
module.exports = router;
