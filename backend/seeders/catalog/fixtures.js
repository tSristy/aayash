'use strict';

/**
 * Ayashmart food catalog starter content for a client walkthrough.
 *
 * 1 parent category + 3 subcategories, 3 product types, 6 products,
 * 12 sellable variants.  Photos, emojis, and unverified supplier brands
 * are intentionally NOT seeded.  Product prices and stock are initial
 * editorial values: client must approve them before accepting live orders.
 */

const categories = [
    {
        slug: 'food',
        name: 'Food',
        parentSlug: null,
        sort_order: 1,
    },
    {
        slug: 'honey-nuts',
        name: 'Honey & Nuts',
        parentSlug: 'food',
        sort_order: 1,
    },
    {
        slug: 'edible-oils',
        name: 'Edible Oils',
        parentSlug: 'food',
        sort_order: 2,
    },
    {
        slug: 'spices-masala',
        name: 'Spices & Masala',
        parentSlug: 'food',
        sort_order: 3,
    },
];

// Avoid stating a supplier/manufacturer that the client has not confirmed.
const brands = [];

const attributes = [
    { code: 'food_ingredients', name: 'Ingredients', data_type: 'textarea' },
    {
        code: 'food_packaging',
        name: 'Packaging',
        data_type: 'select',
        choices: ['Jar', 'Bottle', 'Pouch'],
    },
    {
        code: 'food_processing_form',
        name: 'Product Form',
        data_type: 'select',
        choices: ['Mixed', 'Whole', 'Liquid', 'Ground'],
    },
    { code: 'food_storage', name: 'Storage Instructions', data_type: 'textarea' },
    { code: 'food_allergen_information', name: 'Allergen Information', data_type: 'textarea' },
    { code: 'food_country_of_origin', name: 'Country of Origin', data_type: 'text' },
    { code: 'food_shelf_life_days', name: 'Shelf Life', data_type: 'number', unit: 'days' },
    { code: 'food_usage_instructions', name: 'Suggested Use', data_type: 'textarea' },
];

const baseAssignments = [
    { code: 'food_ingredients', group: 'Food Information', required: true },
    { code: 'food_processing_form', group: 'Food Information', required: true, filterable: true },
    { code: 'food_packaging', group: 'Packaging', required: true, filterable: true },
    { code: 'food_storage', group: 'Storage & Care' },
    { code: 'food_allergen_information', group: 'Storage & Care' },
    { code: 'food_country_of_origin', group: 'Product Details', filterable: true },
    { code: 'food_shelf_life_days', group: 'Product Details' },
    { code: 'food_usage_instructions', group: 'Product Details' },
];

const productTypes = [
    {
        code: 'food_honey_nuts',
        name: 'Honey & Nuts',
        description: 'Packaged honey, honey blends and nut-based food products.',
        assignments: baseAssignments,
    },
    {
        code: 'food_edible_oils',
        name: 'Edible Oils',
        description: 'Food-grade cooking oils in volume-based packages.',
        assignments: baseAssignments,
    },
    {
        code: 'food_spices',
        name: 'Spices & Masala',
        description: 'Whole and ground kitchen spices in weight-based packs.',
        assignments: baseAssignments,
    },
];

const products = [
    {
        slug: 'honey-mixed-nuts',
        name: 'Honey Mixed Nuts',
        categorySlug: 'honey-nuts',
        typeCode: 'food_honey_nuts',
        brandSlug: null,
        short_desc: 'Mixed nuts with honey in easy-to-serve jars.',
        description: 'A convenient honey and mixed nuts combination. Choose a jar size for your pantry or gifting needs.',
        featured: true,
        specs: {
            food_ingredients: 'Honey and mixed nuts',
            food_processing_form: 'Mixed',
            food_packaging: 'Jar',
            food_storage: 'Keep the jar tightly closed and store away from heat and direct sunlight.',
            food_allergen_information: 'Contains nuts. Check the product packaging for the full allergen declaration.',
        },
        options: [{ code: 'weight', name: 'Weight', values: ['250g', '500g'] }],
        variants: [
            { sku: 'AYA-HMN-250', label: '250g', price: 450, stock: 20, is_default: true, choices: { weight: '250g' } },
            { sku: 'AYA-HMN-500', label: '500g', price: 850, stock: 15, choices: { weight: '500g' } },
        ],
    },
    {
        slug: 'honey',
        name: 'Honey',
        categorySlug: 'honey-nuts',
        typeCode: 'food_honey_nuts',
        brandSlug: null,
        short_desc: 'Honey available in two convenient jar sizes.',
        description: 'Honey for everyday kitchen use, breakfast and beverages. Select the jar size that suits your needs.',
        featured: true,
        specs: {
            food_ingredients: 'Honey',
            food_processing_form: 'Liquid',
            food_packaging: 'Jar',
            food_storage: 'Store tightly closed in a cool, dry place.',
            food_usage_instructions: 'Use in drinks, desserts or breakfast recipes.',
        },
        options: [{ code: 'weight', name: 'Weight', values: ['250g', '500g'] }],
        variants: [
            { sku: 'AYA-HNY-250', label: '250g', price: 240, stock: 25, is_default: true, choices: { weight: '250g' } },
            { sku: 'AYA-HNY-500', label: '500g', price: 450, stock: 20, choices: { weight: '500g' } },
        ],
    },
    {
        slug: 'mustard-oil',
        name: 'Mustard Oil',
        categorySlug: 'edible-oils',
        typeCode: 'food_edible_oils',
        brandSlug: null,
        short_desc: 'Mustard oil for everyday cooking, in bottles.',
        description: 'Mustard oil for traditional cooking recipes. Available in practical 500ml and 1L bottles.',
        featured: true,
        specs: {
            food_ingredients: 'Mustard oil',
            food_processing_form: 'Liquid',
            food_packaging: 'Bottle',
            food_storage: 'Keep sealed and store away from direct heat and sunlight.',
            food_usage_instructions: 'Use for cooking as directed on the original package.',
        },
        options: [{ code: 'volume', name: 'Volume', values: ['500ml', '1L'] }],
        variants: [
            { sku: 'AYA-MSO-500', label: '500ml', price: 180, stock: 25, is_default: true, choices: { volume: '500ml' } },
            { sku: 'AYA-MSO-1000', label: '1L', price: 340, stock: 18, choices: { volume: '1L' } },
        ],
    },
    {
        slug: 'soybean-oil',
        name: 'Soybean Oil',
        categorySlug: 'edible-oils',
        typeCode: 'food_edible_oils',
        brandSlug: null,
        short_desc: 'Soybean oil in convenient 1L and 2L bottles.',
        description: 'A pantry staple for everyday cooking. Select a bottle size based on household needs.',
        featured: false,
        specs: {
            food_ingredients: 'Soybean oil',
            food_processing_form: 'Liquid',
            food_packaging: 'Bottle',
            food_storage: 'Store sealed in a cool place away from direct sunlight.',
        },
        options: [{ code: 'volume', name: 'Volume', values: ['1L', '2L'] }],
        variants: [
            { sku: 'AYA-SBO-1000', label: '1L', price: 205, stock: 30, is_default: true, choices: { volume: '1L' } },
            { sku: 'AYA-SBO-2000', label: '2L', price: 400, stock: 20, choices: { volume: '2L' } },
        ],
    },
    {
        slug: 'turmeric-powder',
        name: 'Turmeric Powder',
        categorySlug: 'spices-masala',
        typeCode: 'food_spices',
        brandSlug: null,
        short_desc: 'Ground turmeric for everyday Bangladeshi cooking.',
        description: 'A kitchen essential used in traditional dishes. Select a 100g or 200g pouch.',
        featured: true,
        specs: {
            food_ingredients: 'Turmeric',
            food_processing_form: 'Ground',
            food_packaging: 'Pouch',
            food_storage: 'Keep the pouch sealed and store in a cool, dry place.',
        },
        options: [{ code: 'weight', name: 'Weight', values: ['100g', '200g'] }],
        variants: [
            { sku: 'AYA-TUR-100', label: '100g', price: 70, stock: 35, is_default: true, choices: { weight: '100g' } },
            { sku: 'AYA-TUR-200', label: '200g', price: 130, stock: 25, choices: { weight: '200g' } },
        ],
    },
    {
        slug: 'red-chilli-powder',
        name: 'Red Chilli Powder',
        categorySlug: 'spices-masala',
        typeCode: 'food_spices',
        brandSlug: null,
        short_desc: 'Ground red chilli powder in resealable pouches.',
        description: 'Add warmth and spice to your favourite recipes. Available in 100g and 200g packs.',
        featured: false,
        specs: {
            food_ingredients: 'Red chilli',
            food_processing_form: 'Ground',
            food_packaging: 'Pouch',
            food_storage: 'Keep sealed, dry and away from direct heat.',
        },
        options: [{ code: 'weight', name: 'Weight', values: ['100g', '200g'] }],
        variants: [
            { sku: 'AYA-RCP-100', label: '100g', price: 95, stock: 35, is_default: true, choices: { weight: '100g' } },
            { sku: 'AYA-RCP-200', label: '200g', price: 180, stock: 25, choices: { weight: '200g' } },
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
