'use strict';
const { Category } = require('../../models');
const { parsePayload, validId, ValidationError } = require('../../validators/catalog-masters');
const { route, notFound } = require('./shared');
async function ensureParent(parentId, recordId = null, activating = false) {
    if (parentId == null)
        return;
    const ids = new Set(recordId ? [recordId] : []);
    let current = parentId;
    while (current !== null) {
        if (ids.has(current))
            throw new ValidationError('Circular category hierarchy is not allowed.');
        ids.add(current);
        const node = await Category.findByPk(current);
        if (!node)
            throw new ValidationError('Parent category does not exist.');
        if (!node.is_active && activating)
            throw new ValidationError('Cannot activate a category under an inactive parent.');
        current = node.parent_id;
    }
}
const { Op } = require('sequelize');
const {
    parseListQuery,
    searchWhere,
    booleanStatus,
    positiveIdFilter,
    paginationResult,
} = require('../../utils/catalog-pagination');
const { listLookup } = require('../../utils/catalog-lookups');

const list = route(async (req, res) => {
    const paging = parseListQuery(req.query);
    const parentId = req.query.parent_id;
    const where = {
        ...searchWhere(paging.search, ['name', 'slug']),
        ...booleanStatus(req.query.status),
    };

    if (parentId === 'root') {
        where.parent_id = { [Op.is]: null };
    } else {
        const parent = positiveIdFilter(parentId, 'Parent Category');
        if (parent !== null) where.parent_id = parent;
    }

    const result = await Category.findAndCountAll({
        attributes: ['id', 'parent_id', 'name', 'slug', 'emoji', 'image_url', 'sort_order', 'is_active'],
        include: [{ model: Category, as: 'parent', attributes: ['id', 'name'], required: false }],
        where,
        limit: paging.limit,
        offset: paging.offset,
        order: [['sort_order', 'ASC'], ['name', 'ASC'], ['id', 'ASC']],
        distinct: true,
    });

    res.json(paginationResult(result, paging));
});
const lookup = route(async (req, res) => {
    await listLookup(req, res, Category, ['name', 'slug']);
});
const get = route(async (req, res) => {
    const row = await Category.findByPk(validId(req.params.id)); if (!row)
        return notFound(res); res.json(row);
});
const create = route(async (req, res) => {
    const input = parsePayload(req.body, 'category');
    await ensureParent(input.parent_id ?? null, null, input.is_active !== false);
    const record = await Category.create(input);
    res.status(201).json(record);
});
const update = route(async (req, res) => {
    const id = validId(req.params.id);
    const item = await Category.findByPk(id);
    if (!item)
        return notFound(res);
    const input = parsePayload(req.body, 'category', 'update');
    const parentId = Object.hasOwn(input, 'parent_id') ? input.parent_id : item.parent_id;
    const enabled = Object.hasOwn(input, 'is_active') ? input.is_active : item.is_active;
    await ensureParent(parentId, id, enabled);
    if (input.is_active === false && item.is_active) {
        const childCount = await Category.count({ where: { parent_id: id, is_active: true } });
        if (childCount)
            throw new ValidationError('Archive active child categories first.', 409);
    }
    await item.update(input);
    res.json(item);
});
module.exports = { list, lookup, get, create, update };
