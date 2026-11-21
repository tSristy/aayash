'use strict';
const { ValidationError, plain, str, id, integer, money, code, checkAttributeValue, optionalKeys } = require('./catalog-dynamic');
const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const url = (v) => {
    if (typeof v !== 'string' || v.length > 500 || !(/^https:\/\/[^\s]+$/i.test(v) || (/^\/(?!\/)[^\s\\]*$/.test(v))))
        throw new ValidationError('Image must have a valid HTTPS or local /path URL.');
    return v;
};
const canonicalOptions = options => JSON.stringify([...options].map(o => ({ code: o.code, name: o.name, values: [...o.values].sort() })).sort((a, b) => a.code.localeCompare(b.code)));
function parseProduct(body) {
    optionalKeys(body, ['name', 'slug', 'category_id', 'brand_id', 'product_type_id', 'short_desc', 'description', 'is_featured', 'status', 'specifications', 'options', 'variants', 'images']);
    const name = str(body.name, 200, 'Product name', true), slug = str(body.slug, 220, 'Slug', true).toLowerCase();
    if (!SLUG.test(slug))
        throw new ValidationError('Slug must contain lowercase letters, numbers and hyphens.');
    const status = body.status || 'draft';
    if (!['draft', 'active', 'archived'].includes(status))
        throw new ValidationError('Invalid product status.');
    const category_id = id(body.category_id), product_type_id = body.product_type_id == null ? null : id(body.product_type_id);
    const brand_id = body.brand_id == null || body.brand_id === '' ? null : id(body.brand_id);
    if (body.is_featured !== undefined && typeof body.is_featured !== 'boolean')
        throw new ValidationError('Featured must be true or false.');
    const specs = body.specifications || [];
    if (!Array.isArray(specs) || specs.length > 100)
        throw new ValidationError('Too many specifications.');
    const specIds = new Set();
    const specifications = specs.map(v => {
        optionalKeys(v, ['attribute_id', 'value']); const a = id(v.attribute_id); if (specIds.has(a))
            throw new ValidationError('Duplicate specification.'); specIds.add(a); return { attribute_id: a, value: v.value };
    });
    const rawOptions = body.options || [];
    if (!Array.isArray(rawOptions) || rawOptions.length > 3)
        throw new ValidationError('Maximum three variant options.');
    const optionCodes = new Set();
    const options = rawOptions.map(o => {
        optionalKeys(o, ['code', 'name', 'values']);
        const c = code(o.code);
        if (optionCodes.has(c))
            throw new ValidationError('Duplicate option code.');
        optionCodes.add(c);
        if (!Array.isArray(o.values) || o.values.length < 1 || o.values.length > 30)
            throw new ValidationError('Every option requires 1-30 values.');
        const values = o.values.map(x => str(x, 100, 'Option value', true));
        if (new Set(values.map(x => x.toLowerCase())).size !== values.length)
            throw new ValidationError('Duplicate option value.');
        return { code: c, name: str(o.name, 100, 'Option name', true), values };
    });
    const rows = body.variants || [];
    if (!Array.isArray(rows) || rows.length > 100)
        throw new ValidationError('Maximum 100 variants per product.');
    if (status === 'active' && !rows.length)
        throw new ValidationError('Published products require at least one variant.');
    const skuSet = new Set(), combinations = new Set();
    const variants = rows.map((r, i) => {
        optionalKeys(r, ['id', 'sku', 'label', 'price', 'compare_at_price', 'stock', 'is_default', 'selections']);
        const sku = str(r.sku, 60, 'SKU', true).toUpperCase();
        if (!/^[A-Z0-9][A-Z0-9._-]*$/.test(sku))
            throw new ValidationError('SKU must use letters, numbers, dash, underscore or dot.');
        if (skuSet.has(sku))
            throw new ValidationError('Duplicate SKU in product.');
        skuSet.add(sku);
        const selection = r.selections || [];
        if (!Array.isArray(selection) || selection.length !== options.length)
            throw new ValidationError('Variant needs one selection for each option.');
        const chosen = new Set();
        const selections = selection.map(s => {
            optionalKeys(s, ['option_code', 'value']);
            const o = options.find(o => o.code === s.option_code);
            if (!o || chosen.has(o.code) || !o.values.includes(s.value))
                throw new ValidationError('Invalid or duplicate variant selection.');
            chosen.add(o.code);
            return { option_code: o.code, value: s.value };
        });
        const key = options.map(o => selections.find(s => s.option_code === o.code)?.value).join('|');
        if (combinations.has(key))
            throw new ValidationError('Duplicate variant combination.');
        combinations.add(key);
        const price = (status !== 'active' && (r.price === '' || r.price === null || r.price === undefined)) ? '0.00' : money(r.price, 'Price'), compare = money(r.compare_at_price, 'Compare-at price', true);
        if (status === 'active' && Number(price) <= 0)
            throw new ValidationError('Price must be greater than zero before publishing.');
        if (compare !== null && Number(compare) < Number(price))
            throw new ValidationError('Compare-at price cannot be below sale price.');
        return { id: r.id == null ? null : id(r.id), sku, label: str(r.label, 60, 'Variant label', true), price, compare_at_price: compare, stock: integer(r.stock, 'Stock', 0, 10000000), is_default: !!r.is_default, selections };
    });
    if (variants.length && variants.filter(v => v.is_default).length !== 1)
        throw new ValidationError('Exactly one variant must be default.');
    const images = body.images || [];
    if (!Array.isArray(images) || images.length > 15)
        throw new ValidationError('Maximum 15 images.');
    const normalizedImages = images.map((im, i) => {
        optionalKeys(im, ['url', 'alt', 'variant_sku']);
        const variant_sku = im.variant_sku ? String(im.variant_sku).trim().toUpperCase() : null;
        if (variant_sku && !skuSet.has(variant_sku))
            throw new ValidationError('Image variant SKU must belong to this product.');
        return { url: url(im.url), alt: str(im.alt || '', 200, 'Image alternative text'), variant_sku, sort_order: i };
    });
    return { product: { name, slug, category_id, brand_id, product_type_id, short_desc: str(body.short_desc, 300, 'Short description'), description: str(body.description, 30000, 'Description'), is_featured: !!body.is_featured, is_active: status === 'active', status, image_url: normalizedImages[0]?.url || null }, specifications, options, variants, images: normalizedImages };
}
module.exports = { parseProduct, canonicalOptions, url, checkAttributeValue };
