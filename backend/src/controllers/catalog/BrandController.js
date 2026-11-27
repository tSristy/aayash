'use strict';
const { Brand } = require('../../models');
const { parsePayload, validId } = require('../../validators/catalog-masters');
const { route, notFound } = require('./shared');
const {
    parseListQuery,
    searchWhere,
    booleanStatus,
    paginationResult,
} = require('../../utils/catalog-pagination');
const { listLookup } = require('../../utils/catalog-lookups');

const list = route(async (req, res) => {
    const paging = parseListQuery(req.query);
    const where = {
        ...searchWhere(paging.search, ['name', 'slug']),
        ...booleanStatus(req.query.status),
    };

    const result = await Brand.findAndCountAll({
        attributes: ['id', 'name', 'slug', 'logo_url', 'is_active'],
        where,
        limit: paging.limit,
        offset: paging.offset,
        order: [['name', 'ASC'], ['id', 'ASC']],
    });

    res.json(paginationResult(result, paging));
});
const lookup = route(async (req, res) => {
    await listLookup(req, res, Brand, ['name', 'slug']);
});
const get = route(async (req, res) => {
    const row = await Brand.findByPk(validId(req.params.id)); if (!row)
        return notFound(res); res.json(row);
});
const create = route(async (req, res) => {
    const input = parsePayload(req.body, 'brand');
    const record = await Brand.create(input);
    res.status(201).json(record);
});
const update = route(async (req, res) => {
    const item = await Brand.findByPk(validId(req.params.id));
    if (!item)
        return notFound(res);
    const input = parsePayload(req.body, 'brand', 'update');
    await item.update(input);
    res.json(item);
});
module.exports = { list, lookup, get, create, update };
