'use strict';
const { Product, ProductVariant, ProductType, AttributeDefinition } = require('../../models');
const { route } = require('./shared');
const overview = route(async (_req, res) => {
  const [products, variants, productTypes, attributes] = await Promise.all([
    Product.count(), ProductVariant.count(), ProductType.count(), AttributeDefinition.count(),
  ]);
  res.json({ products, variants, productTypes, attributes });
});
module.exports = { overview };
