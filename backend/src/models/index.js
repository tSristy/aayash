'use strict';
const { sequelize } = require('../db/sequelize');
// Each table has one model file. Register all models once, then configure associations.
const definitions = {
  AdminRole: require('./admin/AdminRole'),
  AdminUser: require('./admin/AdminUser'),
  AdminSession: require('./admin/AdminSession'),
  Order: require('./orders/Order'),
  OrderItem: require('./orders/OrderItem'),
  OrderStatusHistory: require('./orders/OrderStatusHistory'),
  CourierProvider: require('./courier/CourierProvider'),
  CourierShipment: require('./courier/CourierShipment'),
  CourierTrackingEvent: require('./courier/CourierTrackingEvent'),
  CourierApiRequest: require('./courier/CourierApiRequest'),
  CourierWebhookEvent: require('./courier/CourierWebhookEvent'),
  CustomerRiskCheck: require('./risk/CustomerRiskCheck'),
  Category: require('./catalog/Category'),
  Brand: require('./catalog/Brand'),
  Product: require('./catalog/Product'),
  ProductVariant: require('./catalog/ProductVariant'),
  ProductImage: require('./catalog/ProductImage'),
  ProductType: require('./catalog/ProductType'),
  AttributeDefinition: require('./catalog/AttributeDefinition'),
  ProductTypeAttribute: require('./catalog/ProductTypeAttribute'),
  ProductAttributeValue: require('./catalog/ProductAttributeValue'),
  ProductOption: require('./catalog/ProductOption'),
  ProductOptionValue: require('./catalog/ProductOptionValue'),
  VariantOptionValue: require('./catalog/VariantOptionValue'),
};
const models = Object.fromEntries(Object.entries(definitions).map(([key, define]) => [key, define(sequelize)]));
const {
  AdminRole, AdminUser, AdminSession, Category, Brand, Product, ProductVariant,
  ProductType, AttributeDefinition, ProductTypeAttribute, ProductAttributeValue, ProductImage,
  ProductOption, ProductOptionValue, VariantOptionValue, Order, OrderItem, OrderStatusHistory,
} = models;

AdminRole.hasMany(AdminUser, { foreignKey: 'role_id', as: 'users' });
AdminUser.belongsTo(AdminRole, { foreignKey: 'role_id', as: 'role' });
AdminUser.hasMany(AdminSession, { foreignKey: 'user_id', as: 'sessions' });
AdminSession.belongsTo(AdminUser, { foreignKey: 'user_id', as: 'user' });
Category.hasMany(Category, { foreignKey: 'parent_id', as: 'children' });
Category.belongsTo(Category, { foreignKey: 'parent_id', as: 'parent' });
Category.hasMany(Product, { foreignKey: 'category_id', as: 'products' });
Product.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });
Brand.hasMany(Product, { foreignKey: 'brand_id', as: 'products' });
Product.belongsTo(Brand, { foreignKey: 'brand_id', as: 'brand' });
ProductType.hasMany(Product, { foreignKey: 'product_type_id', as: 'products' });
Product.belongsTo(ProductType, { foreignKey: 'product_type_id', as: 'productType' });
Product.hasMany(ProductVariant, { foreignKey: 'product_id', as: 'variants' });
ProductVariant.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
Product.hasMany(ProductImage, { foreignKey: 'product_id', as: 'images' });
ProductImage.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
ProductVariant.hasMany(ProductImage, { foreignKey: 'variant_id', as: 'images' });
ProductImage.belongsTo(ProductVariant, { foreignKey: 'variant_id', as: 'variant' });
ProductType.hasMany(ProductTypeAttribute, { foreignKey: 'product_type_id', as: 'attributeAssignments' });
ProductTypeAttribute.belongsTo(ProductType, { foreignKey: 'product_type_id', as: 'productType' });
AttributeDefinition.hasMany(ProductTypeAttribute, { foreignKey: 'attribute_id', as: 'typeAssignments' });
ProductTypeAttribute.belongsTo(AttributeDefinition, { foreignKey: 'attribute_id', as: 'attribute' });
Product.hasMany(ProductAttributeValue, { foreignKey: 'product_id', as: 'specifications' });
ProductAttributeValue.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
AttributeDefinition.hasMany(ProductAttributeValue, { foreignKey: 'attribute_id', as: 'values' });
ProductAttributeValue.belongsTo(AttributeDefinition, { foreignKey: 'attribute_id', as: 'attribute' });
Product.hasMany(ProductOption, { foreignKey: 'product_id', as: 'options' });
ProductOption.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
ProductOption.hasMany(ProductOptionValue, { foreignKey: 'option_id', as: 'values' });
ProductOptionValue.belongsTo(ProductOption, { foreignKey: 'option_id', as: 'option' });
ProductVariant.hasMany(VariantOptionValue, { foreignKey: 'variant_id', as: 'selectedOptions' });
VariantOptionValue.belongsTo(ProductVariant, { foreignKey: 'variant_id', as: 'variant' });
ProductOptionValue.hasMany(VariantOptionValue, { foreignKey: 'option_value_id', as: 'variantAssignments' });
VariantOptionValue.belongsTo(ProductOptionValue, { foreignKey: 'option_value_id', as: 'optionValue' });

Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
Order.hasMany(OrderStatusHistory, { foreignKey: 'order_id', as: 'statusHistory' });
OrderStatusHistory.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
AdminUser.hasMany(OrderStatusHistory, { foreignKey: 'changed_by_admin_id', as: 'orderChanges' });
OrderStatusHistory.belongsTo(AdminUser, { foreignKey: 'changed_by_admin_id', as: 'actor' });

const {
  CourierProvider,
  CourierShipment,
  CourierTrackingEvent,
  CourierApiRequest,
  CourierWebhookEvent,
  CustomerRiskCheck,
} = models;

Order.hasMany(CourierShipment, { foreignKey: 'order_id', as: 'shipments' });
CourierShipment.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });
CourierProvider.hasMany(CourierShipment, { foreignKey: 'provider_id', as: 'shipments' });
CourierShipment.belongsTo(CourierProvider, { foreignKey: 'provider_id', as: 'provider' });
CourierShipment.hasMany(CourierTrackingEvent, { foreignKey: 'shipment_id', as: 'events' });
CourierTrackingEvent.belongsTo(CourierShipment, { foreignKey: 'shipment_id', as: 'shipment' });
CourierProvider.hasMany(CourierApiRequest, { foreignKey: 'provider_id', as: 'apiRequests' });
CourierApiRequest.belongsTo(CourierProvider, { foreignKey: 'provider_id', as: 'provider' });
CourierProvider.hasMany(CourierWebhookEvent, { foreignKey: 'provider_id', as: 'webhooks' });
CourierWebhookEvent.belongsTo(CourierProvider, { foreignKey: 'provider_id', as: 'provider' });
Order.hasMany(CustomerRiskCheck, { foreignKey: 'order_id', as: 'riskChecks' });
CustomerRiskCheck.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

module.exports = { sequelize, ...models };
