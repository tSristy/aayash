'use strict';

const express = require('express');
const { requireCatalogWriteOrigin } = require('../../../middleware/catalog-origin');
const { uploadProductImage } = require('../../../controllers/media/MediaController');

const router = express.Router();

// Parent /api/admin/catalog route already checks the admin session and role.
router.post('/images', requireCatalogWriteOrigin, uploadProductImage);

module.exports = router;
