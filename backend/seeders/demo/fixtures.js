'use strict';

/**
 * Development-only catalog fixtures.
 * All slugs, attribute codes and SKUs are namespaced to avoid collisions
 * with products created manually by the Ayashmart admin team.
 * Prices and specifications are illustrative, not verified sale listings.
 */
const categories = [
    { slug: 'demo-food', name: '[DEMO] Food', parentSlug: null, emoji: '🍯', sort_order: 1 },
    { slug: 'demo-honey-nuts', name: '[DEMO] Honey & Nuts', parentSlug: 'demo-food', emoji: '🥜', sort_order: 1 },
    { slug: 'demo-spices', name: '[DEMO] Spices & Masala', parentSlug: 'demo-food', emoji: '🌶️', sort_order: 2 },
    { slug: 'demo-beverages', name: '[DEMO] Beverages', parentSlug: 'demo-food', emoji: '🥭', sort_order: 3 },
    { slug: 'demo-electronics', name: '[DEMO] Electronics', parentSlug: null, emoji: '💻', sort_order: 2 },
    { slug: 'demo-laptops', name: '[DEMO] Laptops', parentSlug: 'demo-electronics', emoji: '💻', sort_order: 1 },
];

const brands = [
    { slug: 'demo-ayashmart-foods', name: '[DEMO] Ayashmart Foods' },
    { slug: 'demo-ayashmart-spices', name: '[DEMO] Ayashmart Spices' },
    { slug: 'demo-pran', name: '[DEMO] PRAN' },
    { slug: 'demo-lenovo', name: '[DEMO] Lenovo' },
];

const attributes = [
    { code: 'demo_ingredients', name: 'Ingredients (Demo)', data_type: 'textarea' },
    { code: 'demo_shelf_life_days', name: 'Shelf Life (Demo)', data_type: 'number', unit: 'days' },
    {
        code: 'demo_allergens',
        name: 'Allergens (Demo)',
        data_type: 'multiselect',
        choices: ['Tree Nuts', 'Peanuts', 'Milk', 'Soy', 'Wheat'],
    },
    { code: 'demo_storage_instructions', name: 'Storage Instructions (Demo)', data_type: 'textarea' },
    {
        code: 'demo_processing_type',
        name: 'Processing Type (Demo)',
        data_type: 'select',
        choices: ['Powdered', 'Whole', 'Roasted'],
    },
    {
        code: 'demo_flavor',
        name: 'Flavor (Demo)',
        data_type: 'select',
        choices: ['Mango', 'Original'],
    },
    { code: 'demo_processor', name: 'Processor (Demo)', data_type: 'text' },
    { code: 'demo_display_inches', name: 'Display Size (Demo)', data_type: 'number', unit: 'inch' },
    { code: 'demo_warranty_months', name: 'Warranty (Demo)', data_type: 'number', unit: 'months' },
];

const productTypes = [
    {
        code: 'demo_honey_nuts',
        name: '[DEMO] Honey & Nuts',
        description: 'Honey and nut products with food specification fields.',
        assignments: [
            { code: 'demo_ingredients', group: 'Food Information', required: true },
            { code: 'demo_shelf_life_days', group: 'Food Information' },
            { code: 'demo_allergens', group: 'Storage & Safety', filterable: true },
            { code: 'demo_storage_instructions', group: 'Storage & Safety' },
        ],
    },
    {
        code: 'demo_spices',
        name: '[DEMO] Spices & Masala',
        description: 'Ground spices and cooking ingredients.',
        assignments: [
            { code: 'demo_ingredients', group: 'Food Information', required: true },
            { code: 'demo_processing_type', group: 'General', required: true, filterable: true },
            { code: 'demo_storage_instructions', group: 'Storage & Safety' },
        ],
    },
    {
        code: 'demo_fruit_drinks',
        name: '[DEMO] Fruit Drinks',
        description: 'Packaged drinks with volume-based variants.',
        assignments: [
            { code: 'demo_ingredients', group: 'Food Information' },
            { code: 'demo_flavor', group: 'General', required: true, filterable: true },
            { code: 'demo_shelf_life_days', group: 'Food Information' },
        ],
    },
    {
        code: 'demo_laptop',
        name: '[DEMO] Laptop',
        description: 'Laptop configuration variants and hardware specifications.',
        assignments: [
            { code: 'demo_processor', group: 'Hardware', required: true, filterable: true },
            { code: 'demo_display_inches', group: 'Display', required: true, filterable: true },
            { code: 'demo_warranty_months', group: 'Warranty & Support' },
        ],
    },
];

const products = [
    {
        slug: 'demo-sweet-honey-nuts',
        name: 'Sweet Honey Nuts (Demo)',
        categorySlug: 'demo-honey-nuts',
        brandSlug: 'demo-ayashmart-foods',
        typeCode: 'demo_honey_nuts',
        short_desc: 'Demo mixed nuts in honey, available in two pack sizes.',
        description: 'Test listing for the Ayashmart frontend team. Not a verified food product.',
        emoji: '🍯',
        featured: true,
        specs: {
            demo_ingredients: 'Honey, almonds, cashews',
            demo_shelf_life_days: 180,
            demo_allergens: ['Tree Nuts'],
            demo_storage_instructions: 'Store in a cool, dry place (QA sample).',
        },
        options: [
            { code: 'weight', name: 'Weight', values: ['250g', '500g'] },
        ],
        variants: [
            { sku: 'DEMO-HNY-250', label: '250g', price: 350, stock: 20, is_default: true, choices: { weight: '250g' } },
            { sku: 'DEMO-HNY-500', label: '500g', price: 650, stock: 12, choices: { weight: '500g' } },
        ],
    },
    {
        slug: 'demo-turmeric-powder',
        name: 'Turmeric Powder (Demo)',
        categorySlug: 'demo-spices',
        brandSlug: 'demo-ayashmart-spices',
        typeCode: 'demo_spices',
        short_desc: 'Demo ground turmeric in two pouch sizes.',
        description: 'Test listing for food specification and SKU validation.',
        emoji: '🌶️',
        specs: {
            demo_ingredients: 'Ground turmeric',
            demo_processing_type: 'Powdered',
            demo_storage_instructions: 'Keep away from moisture (QA sample).',
        },
        options: [
            { code: 'weight', name: 'Weight', values: ['100g', '200g'] },
        ],
        variants: [
            { sku: 'DEMO-TUR-100', label: '100g', price: 65, stock: 40, is_default: true, choices: { weight: '100g' } },
            { sku: 'DEMO-TUR-200', label: '200g', price: 120, stock: 25, choices: { weight: '200g' } },
        ],
    },
    {
        slug: 'demo-mango-fruit-drink',
        name: 'Mango Fruit Drink (Demo)',
        categorySlug: 'demo-beverages',
        brandSlug: 'demo-pran',
        typeCode: 'demo_fruit_drinks',
        short_desc: 'Mango-flavored drink for testing volume variants.',
        description: 'Illustrative QA listing; packaging and pricing are sample values.',
        emoji: '🥭',
        specs: {
            demo_ingredients: 'Mango fruit drink (sample description)',
            demo_flavor: 'Mango',
            demo_shelf_life_days: 180,
        },
        options: [
            { code: 'volume', name: 'Volume', values: ['250ml', '500ml'] },
        ],
        variants: [
            { sku: 'DEMO-MGO-250', label: '250ml', price: 35, stock: 60, is_default: true, choices: { volume: '250ml' } },
            { sku: 'DEMO-MGO-500', label: '500ml', price: 65, stock: 30, choices: { volume: '500ml' } },
        ],
    },
    {
        slug: 'demo-lenovo-laptop',
        name: 'Lenovo Laptop (Demo)',
        categorySlug: 'demo-laptops',
        brandSlug: 'demo-lenovo',
        typeCode: 'demo_laptop',
        short_desc: 'Demo laptop with RAM and SSD configuration choices.',
        description: 'Illustrative configuration for testing variant combinations, not a verified Lenovo SKU.',
        emoji: '💻',
        specs: {
            demo_processor: 'Intel Core i5 (QA sample)',
            demo_display_inches: 15.6,
            demo_warranty_months: 24,
        },
        options: [
            { code: 'ram', name: 'RAM', values: ['8GB', '16GB'] },
            { code: 'ssd', name: 'SSD', values: ['256GB', '512GB'] },
        ],
        variants: [
            { sku: 'DEMO-LAP-8-256', label: '8GB / 256GB', price: 58000, stock: 4, is_default: true, choices: { ram: '8GB', ssd: '256GB' } },
            { sku: 'DEMO-LAP-8-512', label: '8GB / 512GB', price: 62000, stock: 5, choices: { ram: '8GB', ssd: '512GB' } },
            { sku: 'DEMO-LAP-16-256', label: '16GB / 256GB', price: 66000, stock: 3, choices: { ram: '16GB', ssd: '256GB' } },
            { sku: 'DEMO-LAP-16-512', label: '16GB / 512GB', price: 70000, stock: 2, choices: { ram: '16GB', ssd: '512GB' } },
        ],
    },
];

module.exports = {
    categories,
    brands,
    attributes,
    productTypes,
    products,
};
