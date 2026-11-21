'use strict';

// Phase 2A: additive Universal Product Catalog foundation.
// Existing products, variants, images and food-specific columns are preserved.
// MariaDB DDL can auto-commit, so each operation is safe to retry after interruption.
const { DataTypes, literal } = require('sequelize');

const tableName = (row) => typeof row === 'string' ? row : (row.tableName || Object.values(row)[0]);

module.exports.up = async (qi) => {
  const existing = new Set((await qi.showAllTables()).map((t) => String(tableName(t)).toLowerCase()));
  for (const required of ['products', 'product_variants']) {
    if (!existing.has(required)) {
      throw new Error(`Base table '${required}' is missing. Initialize the original commerce schema before migration 002.`);
    }
  }

  const create = async (name, attributes) => {
    if (existing.has(name)) return;
    await qi.createTable(name, attributes, { engine: 'InnoDB', charset: 'utf8mb4' });
    existing.add(name);
  };
  const ensureIndex = async (table, fields, name, unique = false) => {
    const indexes = await qi.showIndex(table);
    if (!indexes.some((idx) => idx.name === name)) {
      await qi.addIndex(table, fields, { name, unique });
    }
  };
  const id = () => ({ type: DataTypes.INTEGER.UNSIGNED, primaryKey: true, autoIncrement: true });
  const fk = (table, options = {}) => ({
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    references: { model: table, key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: options.onDelete || 'RESTRICT',
  });
  const timestamp = () => ({ type: DataTypes.DATE, allowNull: false, defaultValue: literal('CURRENT_TIMESTAMP') });

  await create('product_types', {
    id: id(),
    code: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(120), allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: timestamp(),
    updated_at: timestamp(),
  });

  await create('attribute_definitions', {
    id: id(),
    code: { type: DataTypes.STRING(80), allowNull: false, unique: true },
    name: { type: DataTypes.STRING(120), allowNull: false },
    data_type: { type: DataTypes.ENUM('text', 'textarea', 'number', 'boolean', 'date', 'select', 'multiselect'), allowNull: false },
    unit: { type: DataTypes.STRING(32), allowNull: true },
    allowed_values_json: { type: DataTypes.JSON, allowNull: true },
    validation_json: { type: DataTypes.JSON, allowNull: true },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    created_at: timestamp(),
    updated_at: timestamp(),
  });

  await create('product_type_attributes', {
    product_type_id: { ...fk('product_types', { onDelete: 'CASCADE' }), primaryKey: true },
    attribute_id: { ...fk('attribute_definitions'), primaryKey: true },
    group_name: { type: DataTypes.STRING(100), allowNull: false, defaultValue: 'General' },
    is_required: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    is_filterable: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    is_visible: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  });
  await ensureIndex('product_type_attributes', ['attribute_id'], 'idx_type_attrs_attribute');

  await create('product_attribute_values', {
    id: id(),
    product_id: fk('products', { onDelete: 'CASCADE' }),
    attribute_id: fk('attribute_definitions'),
    value_text: { type: DataTypes.TEXT('long'), allowNull: true },
    value_number: { type: DataTypes.DECIMAL(18, 4), allowNull: true },
    value_boolean: { type: DataTypes.BOOLEAN, allowNull: true },
    value_date: { type: DataTypes.DATEONLY, allowNull: true },
    value_json: { type: DataTypes.JSON, allowNull: true },
    updated_at: timestamp(),
  });
  await ensureIndex('product_attribute_values', ['product_id', 'attribute_id'], 'uq_product_attribute', true);
  await ensureIndex('product_attribute_values', ['attribute_id'], 'idx_attribute_values_attribute');

  await create('product_options', {
    id: id(),
    product_id: fk('products', { onDelete: 'CASCADE' }),
    code: { type: DataTypes.STRING(80), allowNull: false },
    name: { type: DataTypes.STRING(100), allowNull: false },
    sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  });
  await ensureIndex('product_options', ['product_id', 'code'], 'uq_product_option_code', true);

  await create('product_option_values', {
    id: id(),
    option_id: fk('product_options', { onDelete: 'CASCADE' }),
    value: { type: DataTypes.STRING(100), allowNull: false },
    sort_order: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  });
  await ensureIndex('product_option_values', ['option_id', 'value'], 'uq_option_value', true);

  await create('variant_option_values', {
    variant_id: { ...fk('product_variants', { onDelete: 'CASCADE' }), primaryKey: true },
    option_value_id: { ...fk('product_option_values', { onDelete: 'CASCADE' }), primaryKey: true },
  });
  await ensureIndex('variant_option_values', ['option_value_id'], 'idx_variant_option_value');

  const columns = await qi.describeTable('products');
  if (!Object.keys(columns).some((col) => col.toLowerCase() === 'product_type_id')) {
    await qi.addColumn('products', 'product_type_id', {
      type: DataTypes.INTEGER.UNSIGNED,
      allowNull: true,
      references: { model: 'product_types', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  }
  await ensureIndex('products', ['product_type_id'], 'idx_products_product_type');
};
