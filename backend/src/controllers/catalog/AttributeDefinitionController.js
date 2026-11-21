'use strict';
const { AttributeDefinition, ProductAttributeValue } = require('../../models');
const { route, notFound } = require('./shared');
const { validateAttribute, id, ValidationError } = require('../../validators/catalog-dynamic');
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
        ...searchWhere(paging.search, ['name', 'code']),
        ...booleanStatus(req.query.status),
    };

    if (req.query.data_type && req.query.data_type !== 'all') {
        const types = ['text', 'textarea', 'number', 'boolean', 'date', 'select', 'multiselect'];
        if (!types.includes(req.query.data_type)) {
            const error = new Error('Invalid attribute data type filter.');
            error.status = 400;
            throw error;
        }
        where.data_type = req.query.data_type;
    }

    const result = await AttributeDefinition.findAndCountAll({
        where,
        limit: paging.limit,
        offset: paging.offset,
        order: [['name', 'ASC'], ['id', 'ASC']],
    });

    res.json(paginationResult(result, paging));
});
const lookup = route(async (req, res) => {
    await listLookup(req, res, AttributeDefinition, ['name', 'code']);
});
const get = route(async (req, res) => {
    const row = await AttributeDefinition.findByPk(id(req.params.id)); if (!row)
        return notFound(res); res.json(row);
});
const create = route(async (req, res) => res.status(201).json(await AttributeDefinition.create(validateAttribute(req.body))));
const update = route(async (req, res) => {
    const row = await AttributeDefinition.findByPk(id(req.params.id));
    if (!row)
        return notFound(res);
    const patch = validateAttribute(req.body, 'update');
    const used = await ProductAttributeValue.count({ where: { attribute_id: row.id } });
    if (used && ('data_type' in patch && patch.data_type !== row.data_type || 'code' in patch && patch.code !== row.code))
        throw new ValidationError('Used attribute code/type cannot be changed.', 409);
    if (used && 'allowed_values_json' in patch) {
        const prev = typeof row.allowed_values_json === 'string' ? JSON.parse(row.allowed_values_json) : row.allowed_values_json || [];
        const next = patch.allowed_values_json || [];
        if (prev.some(x => !next.includes(x)))
            throw new ValidationError('Cannot remove options from an attribute already holding product values.', 409);
    }
    if (['select', 'multiselect'].includes(patch.data_type || row.data_type) && !(('allowed_values_json' in patch ? patch.allowed_values_json : row.allowed_values_json) || []).length)
        throw new ValidationError('Select attributes require options.');
    res.json(await row.update(patch));
});
module.exports = { list, lookup, get, create, update };
