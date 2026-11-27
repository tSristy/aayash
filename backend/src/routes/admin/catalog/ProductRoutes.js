'use strict';
const r=require('express').Router(),c=require('../../../controllers/catalog/ProductController');
const {requireCatalogWriteOrigin}=require('../../../middleware/catalog-origin');
r.get('/',c.list);r.get('/:id',c.get);
r.post('/',requireCatalogWriteOrigin,c.create);
r.put('/:id',requireCatalogWriteOrigin,c.update);
r.post('/:id/copy',requireCatalogWriteOrigin,c.duplicate);
r.patch('/:id/status',requireCatalogWriteOrigin,c.setStatus);
module.exports=r;
