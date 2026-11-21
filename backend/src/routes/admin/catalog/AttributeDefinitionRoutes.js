'use strict';
const r = require('express').Router(), c = require('../../../controllers/catalog/AttributeDefinitionController');
const { requireCatalogWriteOrigin } = require('../../../middleware/catalog-origin');
r.get('/', c.list);
r.get('/lookup', c.lookup); r.get('/:id', c.get); 
r.post('/', requireCatalogWriteOrigin, c.create); 
r.patch('/:id', requireCatalogWriteOrigin, c.update);
module.exports = r;
