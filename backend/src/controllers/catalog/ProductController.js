'use strict';
const { sequelize, Product, Category, Brand, ProductType, AttributeDefinition, ProductTypeAttribute, ProductAttributeValue, ProductVariant, ProductOption, ProductOptionValue, VariantOptionValue, ProductImage } = require('../../models');
const { route, notFound } = require('./shared');
const { ValidationError, id } = require('../../validators/catalog-dynamic');
const { parseProduct, canonicalOptions, checkAttributeValue } = require('../../validators/catalog-products');
const { Op, QueryTypes } = require('sequelize');
const parseJson = v => typeof v === 'string' ? JSON.parse(v) : v;
async function getDetails(productId, transaction) {
    const p = await Product.findByPk(productId, { transaction, include: [{ model: Category, as: 'category', attributes: ['id', 'name', 'slug'] }, { model: Brand, as: 'brand', attributes: ['id', 'name'] }, { model: ProductType, as: 'productType', attributes: ['id', 'name'] }] });
    if (!p)
        return null;
    const [rows, options, variants, images] = await Promise.all([
        ProductAttributeValue.findAll({ where: { product_id: productId }, include: [{ model: AttributeDefinition, as: 'attribute' }], transaction }),
        ProductOption.findAll({ where: { product_id: productId }, include: [{ model: ProductOptionValue, as: 'values' }], order: [['sort_order', 'ASC']], transaction }),
        ProductVariant.findAll({ where: { product_id: productId }, order: [['id', 'ASC']], transaction }),
        ProductImage.findAll({ where: { product_id: productId }, order: [['sort_order', 'ASC']], transaction }),
    ]);
    const map = {}, variantIds = variants.map(v => v.id), optIds = options.flatMap(o => o.values.map(v => v.id));
    for (const opt of options)
        for (const value of opt.values)
            map[value.id] = { option_code: opt.code, value: value.value };
    const selections = variantIds.length ? await VariantOptionValue.findAll({ where: { variant_id: variantIds }, transaction }) : [];
    const byVariant = {};
    for (const pair of selections) {
        (byVariant[pair.variant_id] ??= []).push(map[pair.option_value_id]);
    }
    const skuById = Object.fromEntries(variants.map(v => [v.id, v.sku]));
    const valueOf = x => {
        const a = x.attribute;
        switch (a.data_type) {
            case 'number': return x.value_number === null ? null : Number(x.value_number);
            case 'boolean': return x.value_boolean === null ? null : !!x.value_boolean;
            case 'date': return x.value_date;
            case 'multiselect': return parseJson(x.value_json);
            default: return x.value_text;
        }
    };
    return { ...p.get({ plain: true }), specifications: rows.map(x => ({ attribute_id: x.attribute_id, name: x.attribute?.name || '', code: x.attribute?.code || '', unit: x.attribute?.unit || '', value: valueOf(x) })),
        options: options.map(o => ({ code: o.code, name: o.name, values: o.values.sort((a, b) => a.sort_order - b.sort_order).map(v => v.value) })),
        variants: variants.map(v => ({ ...v.get({ plain: true }), selections: byVariant[v.id] || [] })),
        images: images.map(im => ({ id: im.id, url: im.url, alt: im.alt, variant_sku: im.variant_id ? skuById[im.variant_id] || null : null })),
    };
}
const {
    parseListQuery,
    searchWhere,
    positiveIdFilter,
    paginationResult,
} = require('../../utils/catalog-pagination');

const list = route(async (req, res) => {
    const paging = parseListQuery(req.query);
    const status = req.query.status || 'all';
    const allowedStatuses = ['all', 'active', 'draft', 'archived'];

    if (!allowedStatuses.includes(status)) {
        throw new ValidationError('Invalid product status filter.');
    }

    const where = searchWhere(paging.search, ['name', 'slug', 'short_desc']);

    if (status !== 'all') {
        where.status = status;
    }

    for (const [parameter, column] of [
        ['category_id', 'category_id'],
        ['brand_id', 'brand_id'],
        ['product_type_id', 'product_type_id'],
    ]) {
        const value = positiveIdFilter(req.query[parameter], parameter);
        if (value !== null) {
            where[column] = value;
        }
    }

    const allowedSort = {
        newest: [['id', 'DESC']],
        oldest: [['id', 'ASC']],
        name_asc: [['name', 'ASC'], ['id', 'ASC']],
        name_desc: [['name', 'DESC'], ['id', 'DESC']],
    };
    const sort = req.query.sort || 'newest';
    if (!Object.hasOwn(allowedSort, sort)) {
        throw new ValidationError('Invalid product sort option.');
    }

    const result = await Product.findAndCountAll({
        where,
        limit: paging.limit,
        offset: paging.offset,
        distinct: true,
        order: allowedSort[sort],
        include: [
            { model: Category, as: 'category', attributes: ['id', 'name'] },
            { model: Brand, as: 'brand', attributes: ['id', 'name'] },
            { model: ProductType, as: 'productType', attributes: ['id', 'name'] },
            {
                model: ProductVariant,
                as: 'variants',
                attributes: ['id', 'price', 'stock', 'is_default'],
            },
        ],
    });

    const products = result.rows.map(record => {
        const product = record.get({ plain: true });
        const variants = product.variants || [];

        return {
            ...product,
            variant_count: variants.length,
            stock_total: variants.reduce((total, variant) => total + Number(variant.stock), 0),
            starting_price: variants.length
                ? Math.min(...variants.map(variant => Number(variant.price)))
                : null,
            variants: undefined,
        };
    });

    res.json(paginationResult(result, paging, products));
});

const get = route(async (req, res) => { const p = await getDetails(id(req.params.id)); if (!p)
    return notFound(res); res.json(p); });
async function validateContext(parsed, transaction) {
    const { product, specifications } = parsed;
    const [category, brand, type] = await Promise.all([Category.findByPk(product.category_id, { transaction }), product.brand_id ? Brand.findByPk(product.brand_id, { transaction }) : null, product.product_type_id ? ProductType.findByPk(product.product_type_id, { transaction }) : null]);
    if (!category || !category.is_active)
        throw new ValidationError('Choose an active category.');
    if (product.brand_id && (!brand || !brand.is_active))
        throw new ValidationError('Choose an active brand.');
    if (product.product_type_id && (!type || !type.is_active))
        throw new ValidationError('Choose an active Product Type.');
    if (product.status === 'active' && !type)
        throw new ValidationError('Choose a Product Type before publishing.');
    const assignments = type ? await ProductTypeAttribute.findAll({ where: { product_type_id: type.id }, include: [{ model: AttributeDefinition, as: 'attribute' }], transaction }) : [];
    if (!type && specifications.length)
        throw new ValidationError('Select a Product Type for specifications.');
    const byId = new Map(assignments.map(a => [a.attribute_id, a]));
    const normalized = [];
    for (const s of specifications) {
        const assignment = byId.get(s.attribute_id);
        if (!assignment || !assignment.attribute.is_active)
            throw new ValidationError('Specification is not assigned to this Product Type.');
        const values = checkAttributeValue(assignment.attribute, s.value);
        if (values)
            normalized.push({ attribute_id: s.attribute_id, ...values });
    }
    if (product.status === 'active')
        for (const a of assignments) {
            if (a.is_required && !normalized.some(v => v.attribute_id === a.attribute_id))
                throw new ValidationError(`${a.attribute.name} is required before publishing.`);
        }
    return normalized;
}
async function persist(productId, parsed, normalized, transaction, existing) {
    // Preserve existing variant identity; never silently replace ordered SKUs.
    const oldVariants = existing ? await ProductVariant.findAll({ where: { product_id: productId }, transaction }) : [];
    const oldMap = new Map(oldVariants.map(v => [v.id, v]));
    const proposedIds = new Set(parsed.variants.filter(v => v.id).map(v => v.id));
    for (const v of parsed.variants)
        if (v.id && !oldMap.has(v.id))
            throw new ValidationError('Variant ID does not belong to this product.');
    const removed = oldVariants.filter(v => !proposedIds.has(v.id));
    const ordered = (oldVariants.length ? await sequelize.query('SELECT variant_id, COUNT(*) AS n FROM order_items WHERE variant_id IN (:ids) GROUP BY variant_id', { replacements: { ids: oldVariants.map(v => v.id) }, type: QueryTypes.SELECT, transaction }) : []);
    const orderedIds = new Set(ordered.filter(x => Number(x.n) > 0).map(x => Number(x.variant_id)));
    for (const v of removed)
        if (orderedIds.has(v.id))
            throw new ValidationError(`Cannot remove ordered SKU ${v.sku}. Archive the whole product instead.`, 409);
    for (const v of parsed.variants)
        if (v.id && orderedIds.has(v.id)) {
            if (oldMap.get(v.id).sku !== v.sku)
                throw new ValidationError('Cannot rename an SKU referenced by an order.', 409);
            const oldDetail = existing.variants.find(x => x.id === v.id);
            const priorCombo = JSON.stringify([...(oldDetail?.selections || [])].sort((a, b) => a.option_code.localeCompare(b.option_code)));
            const newCombo = JSON.stringify([...v.selections].sort((a, b) => a.option_code.localeCompare(b.option_code)));
            if (priorCombo !== newCombo)
                throw new ValidationError('Cannot change the option combination of an ordered SKU.', 409);
        }
    if (orderedIds.size && existing && parsed.product.product_type_id !== existing.product_type_id)
        throw new ValidationError('Cannot change Product Type after orders exist.', 409);
    if (orderedIds.size && existing && canonicalOptions(parsed.options) !== canonicalOptions(existing.options))
        throw new ValidationError('Cannot restructure variant options of a product with existing orders.', 409);
    // Image rows reference variants: clear image associations before modifying variants.
    await ProductImage.destroy({ where: { product_id: productId }, transaction });
    await VariantOptionValue.destroy({ where: { variant_id: oldVariants.map(v => v.id) }, transaction });
    const [oldOpt] = await Promise.all([ProductOption.findAll({ where: { product_id: productId }, transaction })]);
    if (oldOpt.length) {
        await ProductOptionValue.destroy({ where: { option_id: oldOpt.map(o => o.id) }, transaction });
        await ProductOption.destroy({ where: { product_id: productId }, transaction });
    }
    if (removed.length)
        await ProductVariant.destroy({ where: { id: removed.map(v => v.id), product_id: productId }, transaction });
    const valuesMap = new Map();
    for (let i = 0; i < parsed.options.length; i++) {
        const o = parsed.options[i], opt = await ProductOption.create({ product_id: productId, code: o.code, name: o.name, sort_order: i }, { transaction });
        for (let n = 0; n < o.values.length; n++) {
            const row = await ProductOptionValue.create({ option_id: opt.id, value: o.values[n], sort_order: n }, { transaction });
            valuesMap.set(`${o.code}\0${o.values[n]}`, row.id);
        }
    }
    const idsBySku = new Map();
    for (const v of parsed.variants) {
        const data = { product_id: productId, sku: v.sku, label: v.label, price: v.price, compare_at_price: v.compare_at_price, stock: v.stock, is_default: v.is_default };
        const saved = v.id ? (await oldMap.get(v.id).update(data, { transaction })) : await ProductVariant.create(data, { transaction });
        idsBySku.set(v.sku, saved.id);
        for (const s of v.selections)
            await VariantOptionValue.create({ variant_id: saved.id, option_value_id: valuesMap.get(`${s.option_code}\0${s.value}`) }, { transaction });
    }
    await ProductAttributeValue.destroy({ where: { product_id: productId }, transaction });
    if (normalized.length)
        await ProductAttributeValue.bulkCreate(normalized.map(s => ({ ...s, product_id: productId })), { transaction });
    for (let i = 0; i < parsed.images.length; i++) {
        const im = parsed.images[i];
        await ProductImage.create({ product_id: productId, variant_id: im.variant_sku ? idsBySku.get(im.variant_sku) : null, url: im.url, alt: im.alt, sort_order: i }, { transaction });
    }
}
const create = route(async (req, res) => {
    const parsed = parseProduct(req.body);
    const saved = await sequelize.transaction(async (transaction) => {
        const specs = await validateContext(parsed, transaction);
        const item = await Product.create(parsed.product, { transaction });
        await persist(item.id, parsed, specs, transaction, null);
        return item.id;
    });
    res.status(201).json(await getDetails(saved));
});
const update = route(async (req, res) => {
    const productId = id(req.params.id), parsed = parseProduct(req.body);
    await sequelize.transaction(async (transaction) => {
        const item = await Product.findByPk(productId, { transaction, lock: transaction.LOCK.UPDATE });
        if (!item)
            throw new ValidationError('Product not found.', 404);
        const existing = await getDetails(productId, transaction), specs = await validateContext(parsed, transaction);
        await persist(productId, parsed, specs, transaction, existing);
        await item.update(parsed.product, { transaction });
    });
    res.json(await getDetails(productId));
});
const setStatus = route(async (req, res) => {
    if (!req.body || !['draft', 'archived', 'active'].includes(req.body.status) || Object.keys(req.body).length !== 1)
        throw new ValidationError('Invalid status request.');
    const productId = id(req.params.id), current = await getDetails(productId);
    if (!current)
        return notFound(res);
    if (req.body.status === 'active') {
        const parsed = parseProduct({ name: current.name, slug: current.slug, category_id: current.category_id, brand_id: current.brand_id, product_type_id: current.product_type_id, short_desc: current.short_desc, description: current.description, is_featured: !!current.is_featured, status: 'active', options: current.options, images: current.images.map(({ url, alt, variant_sku }) => ({ url, alt, variant_sku })), specifications: current.specifications, variants: current.variants.map(({ id, sku, label, price, compare_at_price, stock, is_default, selections }) => ({ id, sku, label, price, compare_at_price, stock, is_default, selections })) });
        await validateContext(parsed);
    }
    await Product.update({ status: req.body.status, is_active: req.body.status === 'active' }, { where: { id: productId } });
    res.json({ id: productId, status: req.body.status });
});
module.exports = { list, get, create, update, setStatus, getDetails };
