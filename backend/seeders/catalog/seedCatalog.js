'use strict';

const fixtures = require('./fixtures');

const CONFIRMATION_TOKEN = 'SEED_AYASHMART_CATALOG';
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);

function assertCatalogSeedAllowed(env, confirmationToken) {
    if (confirmationToken !== CONFIRMATION_TOKEN) {
        throw new Error(
            `Confirmation required. Run: npm run seed:catalog -- ${CONFIRMATION_TOKEN}`
        );
    }

    if (env.NODE_ENV !== 'development') {
        throw new Error('Catalog seeding is available only when NODE_ENV=development.');
    }

    const host = String(env.DB_HOST || '127.0.0.1').toLowerCase();
    const database = String(env.DB_NAME || 'aayash_emart');

    if (!LOCAL_HOSTS.has(host)) {
        throw new Error('Catalog seeding is restricted to a local MariaDB server.');
    }

    if (database !== 'aayash_emart') {
        throw new Error('Catalog seeding is permitted only for the aayash_emart database.');
    }
}

function assertUnique(values, label) {
    if (new Set(values).size !== values.length) {
        throw new Error(`Duplicate fixture ${label} detected.`);
    }
}

function validateFixtures(plan = fixtures) {
    const categorySlugs = new Set(plan.categories.map((item) => item.slug));
    const brandSlugs = new Set(plan.brands.map((item) => item.slug));
    const attributeCodes = new Set(plan.attributes.map((item) => item.code));
    const typeCodes = new Set(plan.productTypes.map((item) => item.code));

    assertUnique(plan.categories.map((item) => item.slug), 'category slug');
    assertUnique(plan.brands.map((item) => item.slug), 'brand slug');
    assertUnique(plan.attributes.map((item) => item.code), 'attribute code');
    assertUnique(plan.productTypes.map((item) => item.code), 'product type code');
    assertUnique(plan.products.map((item) => item.slug), 'product slug');
    assertUnique(plan.products.flatMap((item) => item.variants.map((v) => v.sku)), 'SKU');

    for (const category of plan.categories) {
        if (category.parentSlug && !categorySlugs.has(category.parentSlug)) {
            throw new Error(`Unknown parent category: ${category.parentSlug}`);
        }
    }

    for (const type of plan.productTypes) {
        for (const assignment of type.assignments) {
            if (!attributeCodes.has(assignment.code)) {
                throw new Error(`Unknown attribute assigned to ${type.code}: ${assignment.code}`);
            }
        }
    }

    for (const product of plan.products) {
        if (!categorySlugs.has(product.categorySlug)) {
            throw new Error(`Unknown category for ${product.slug}`);
        }

        if ((product.brandSlug && !brandSlugs.has(product.brandSlug)) ||
            !typeCodes.has(product.typeCode)) {
            throw new Error(`Unknown brand or product type for ${product.slug}`);
        }

        const type = plan.productTypes.find((item) => item.code === product.typeCode);
        const allowedCodes = new Set(type.assignments.map((item) => item.code));
        const optionMap = new Map(product.options.map((item) => [item.code, item]));
        const combinations = new Set();

        assertUnique(product.options.map((item) => item.code), 'product option');

        for (const assignment of type.assignments) {
            if (assignment.required && product.specs[assignment.code] == null) {
                throw new Error(`Required attribute ${assignment.code} missing for ${product.slug}`);
            }
        }

        for (const [code, value] of Object.entries(product.specs)) {
            const attribute = plan.attributes.find((item) => item.code === code);

            if (!allowedCodes.has(code) || !attribute) {
                throw new Error(`Invalid specification ${code} for ${product.slug}`);
            }

            if (attribute.choices) {
                const values = Array.isArray(value) ? value : [value];
                if (values.some((entry) => !attribute.choices.includes(entry))) {
                    throw new Error(`Unknown choice in ${code} for ${product.slug}`);
                }
            }
        }

        if (product.variants.filter((variant) => variant.is_default === true).length !== 1) {
            throw new Error(`Exactly one default variant required for ${product.slug}`);
        }

        for (const variant of product.variants) {
            const choiceCodes = Object.keys(variant.choices);
            assertUnique(choiceCodes, 'variant choice');

            if (choiceCodes.length !== product.options.length) {
                throw new Error(`Incomplete variant choices for ${variant.sku}`);
            }

            for (const [code, value] of Object.entries(variant.choices)) {
                const option = optionMap.get(code);
                if (!option || !option.values.includes(value)) {
                    throw new Error(`Invalid choice ${code}:${value} on ${variant.sku}`);
                }
            }

            const combination = product.options
                .map((option) => `${option.code}:${variant.choices[option.code]}`)
                .join('|');

            if (combinations.has(combination)) {
                throw new Error(`Duplicate variant combination for ${product.slug}`);
            }

            combinations.add(combination);
        }
    }

    return true;
}

function buildSpecificationValue(attribute, value) {
    switch (attribute.data_type) {
        case 'number':
            return { value_number: value };
        case 'boolean':
            return { value_boolean: Boolean(value) };
        case 'date':
            return { value_date: value };
        case 'multiselect':
            return { value_json: value };
        default:
            return { value_text: value };
    }
}

async function seedCatalog(models, plan = fixtures) {
    validateFixtures(plan);

    const {
        sequelize,
        Category,
        Brand,
        AttributeDefinition,
        ProductType,
        ProductTypeAttribute,
        Product,
        ProductAttributeValue,
        ProductOption,
        ProductOptionValue,
        ProductVariant,
        VariantOptionValue,
    } = models;

    const inserted = {};
    const categoryIds = new Map();
    const brandIds = new Map();
    const attributeIds = new Map();
    const typeIds = new Map();
    const attributesByCode = new Map(plan.attributes.map((item) => [item.code, item]));

    return sequelize.transaction(async (transaction) => {
        async function getOrCreate(Model, where, defaults, counter) {
            const [record, created] = await Model.findOrCreate({
                where,
                defaults,
                transaction,
            });

            if (created) {
                inserted[counter] = (inserted[counter] || 0) + 1;
            }

            return record;
        }

        // The fixtures intentionally list each parent category before its children.
        for (const category of plan.categories) {
            const parentId = category.parentSlug
                ? categoryIds.get(category.parentSlug)
                : null;

            const record = await getOrCreate(
                Category,
                { slug: category.slug },
                {
                    name: category.name,
                    slug: category.slug,
                    parent_id: parentId,
                    emoji: category.emoji || null,
                    image_url: null,
                    sort_order: category.sort_order,
                    is_active: true,
                },
                'categories'
            );

            categoryIds.set(category.slug, record.id);
        }

        for (const brand of plan.brands) {
            const record = await getOrCreate(
                Brand,
                { slug: brand.slug },
                { ...brand, is_active: true },
                'brands'
            );

            brandIds.set(brand.slug, record.id);
        }

        for (const attribute of plan.attributes) {
            const record = await getOrCreate(
                AttributeDefinition,
                { code: attribute.code },
                {
                    code: attribute.code,
                    name: attribute.name,
                    data_type: attribute.data_type,
                    unit: attribute.unit || null,
                    allowed_values_json: attribute.choices || null,
                    validation_json: null,
                    is_active: true,
                },
                'attributes'
            );

            attributeIds.set(attribute.code, record.id);
        }

        for (const type of plan.productTypes) {
            const record = await getOrCreate(
                ProductType,
                { code: type.code },
                {
                    name: type.name,
                    code: type.code,
                    description: type.description,
                    is_active: true,
                },
                'productTypes'
            );

            typeIds.set(type.code, record.id);

            for (const [index, assignment] of type.assignments.entries()) {
                await getOrCreate(
                    ProductTypeAttribute,
                    {
                        product_type_id: record.id,
                        attribute_id: attributeIds.get(assignment.code),
                    },
                    {
                        group_name: assignment.group,
                        is_required: Boolean(assignment.required),
                        is_filterable: Boolean(assignment.filterable),
                        is_visible: true,
                        sort_order: index + 1,
                    },
                    'attributeAssignments'
                );
            }
        }

        for (const product of plan.products) {
            const record = await getOrCreate(
                Product,
                { slug: product.slug },
                {
                    name: product.name,
                    slug: product.slug,
                    category_id: categoryIds.get(product.categorySlug),
                    brand_id: product.brandSlug ? brandIds.get(product.brandSlug) : null,
                    product_type_id: typeIds.get(product.typeCode),
                    short_desc: product.short_desc,
                    description: product.description,
                    emoji: product.emoji || null,
                    image_url: null,
                    is_featured: Boolean(product.featured),
                    is_active: true,
                    status: 'active',
                },
                'products'
            );

            if (Number(record.category_id) !== Number(categoryIds.get(product.categorySlug)) ||
                Number(record.product_type_id) !== Number(typeIds.get(product.typeCode))) {
                throw new Error(
                    `Existing product slug ${product.slug} uses a different category or product type. ` +
                    'Review it in Admin rather than silently overwriting it.'
                );
            }

            for (const [code, value] of Object.entries(product.specs)) {
                await getOrCreate(
                    ProductAttributeValue,
                    {
                        product_id: record.id,
                        attribute_id: attributeIds.get(code),
                    },
                    buildSpecificationValue(attributesByCode.get(code), value),
                    'specifications'
                );
            }

            const optionValueIds = new Map();

            for (const [optionIndex, option] of product.options.entries()) {
                const optionRecord = await getOrCreate(
                    ProductOption,
                    { product_id: record.id, code: option.code },
                    { name: option.name, sort_order: optionIndex + 1 },
                    'productOptions'
                );

                for (const [valueIndex, value] of option.values.entries()) {
                    const optionValue = await getOrCreate(
                        ProductOptionValue,
                        { option_id: optionRecord.id, value },
                        { sort_order: valueIndex + 1 },
                        'optionValues'
                    );

                    optionValueIds.set(`${option.code}:${value}`, optionValue.id);
                }
            }

            for (const variant of product.variants) {
                const variantRecord = await getOrCreate(
                    ProductVariant,
                    { sku: variant.sku },
                    {
                        product_id: record.id,
                        label: variant.label,
                        price: variant.price,
                        compare_at_price: null,
                        stock: variant.stock,
                        is_default: Boolean(variant.is_default),
                    },
                    'variants'
                );

                // A SKU belongs to exactly one product. A collision is not safe to reuse.
                if (Number(variantRecord.product_id) !== Number(record.id)) {
                    throw new Error(`SKU ${variant.sku} belongs to a different product.`);
                }

                for (const [optionCode, optionValue] of Object.entries(variant.choices)) {
                    await getOrCreate(
                        VariantOptionValue,
                        {
                            variant_id: variantRecord.id,
                            option_value_id: optionValueIds.get(`${optionCode}:${optionValue}`),
                        },
                        {},
                        'variantOptionMappings'
                    );
                }
            }
        }

        return {
            inserted,
            target: {
                categories: plan.categories.length,
                brands: plan.brands.length,
                attributes: plan.attributes.length,
                productTypes: plan.productTypes.length,
                products: plan.products.length,
                variants: plan.products.reduce((sum, item) => sum + item.variants.length, 0),
            },
        };
    });
}

module.exports = {
    CONFIRMATION_TOKEN,
    assertCatalogSeedAllowed,
    validateFixtures,
    buildSpecificationValue,
    seedCatalog,
};
