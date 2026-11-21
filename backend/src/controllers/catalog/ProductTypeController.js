'use strict';
const { sequelize, ProductType, ProductTypeAttribute, AttributeDefinition, ProductAttributeValue, Product } = require('../../models');
const { route, notFound } = require('./shared');
const { validateType, validateAssignments, id, ValidationError } = require('../../validators/catalog-dynamic');
const full = { model: ProductTypeAttribute, as: 'attributeAssignments', include: [{ model: AttributeDefinition, as: 'attribute' }] };
const {
    parseListQuery,
    searchWhere,
    booleanStatus,
    paginationResult,
} = require('../../utils/catalog-pagination');
const { listLookup } = require('../../utils/catalog-lookups');

const list = route(async (req, res) => {
    const paging = parseListQuery(req.query);
    const result = await ProductType.findAndCountAll({
        where: {
            ...searchWhere(paging.search, ['name', 'code', 'description']),
            ...booleanStatus(req.query.status),
        },
        limit: paging.limit,
        offset: paging.offset,
        order: [['name', 'ASC'], ['id', 'ASC']],
    });

    res.json(paginationResult(result, paging));
});
const lookup = route(async (req, res) => {
    await listLookup(req, res, ProductType, ['name', 'code']);
});
const get = route(async (req, res) => {
    const item = await ProductType.findByPk(id(req.params.id), { include: [full] }); if (!item)
        return notFound(res); res.json(item);
});
const create = route(async (req, res) => res.status(201).json(await ProductType.create(validateType(req.body))));
const update = route(async (req, res) => {
    const item = await ProductType.findByPk(id(req.params.id)); if (!item)
        return notFound(res); const patch = validateType(req.body, 'update'); if ('code' in patch && patch.code !== item.code && await Product.count({ where: { product_type_id: item.id } }))
        throw new ValidationError('Code cannot change once products use this type.', 409); res.json(await item.update(patch));
});
const setAttributes = route(async (req, res) => {
    const typeId = id(req.params.id), data = validateAssignments(req.body);
    await sequelize.transaction(async (transaction) => {
        const type = await ProductType.findByPk(typeId, { transaction, lock: transaction.LOCK.UPDATE });
        if (!type)
            throw new ValidationError('Product Type not found.', 404);
        const old = await ProductTypeAttribute.findAll({ where: { product_type_id: typeId }, transaction });
        const attrs = await AttributeDefinition.findAll({ where: { id: data.map(x => x.attribute_id) }, transaction });
        const oldIds = new Set(old.map(x => x.attribute_id));
        if (attrs.length !== data.length || attrs.some(x => !x.is_active && !oldIds.has(x.id)))
            throw new ValidationError('Newly assigned attributes must exist and be active.');
        const removed = old.filter(a => !data.some(n => n.attribute_id === a.attribute_id)).map(a => a.attribute_id);
        if (removed.length) {
            const productIds = (await Product.findAll({ attributes: ['id'], where: { product_type_id: typeId }, transaction })).map(x => x.id);
            if (productIds.length && await ProductAttributeValue.count({ where: { product_id: productIds, attribute_id: removed }, transaction }))
                throw new ValidationError('Cannot remove attribute assignments holding product specifications.', 409);
        }
        await ProductTypeAttribute.destroy({ where: { product_type_id: typeId }, transaction });
        if (data.length)
            await ProductTypeAttribute.bulkCreate(data.map(x => ({ ...x, product_type_id: typeId })), { transaction });
    });
    res.json(await ProductType.findByPk(typeId, { include: [full] }));
});
module.exports = { list, lookup, get, create, update, setAttributes };
