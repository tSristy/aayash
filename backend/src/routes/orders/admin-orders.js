'use strict';

const express = require('express');
const { requirePermission } = require('../../auth/access');
const { requireCatalogWriteOrigin } = require('../../middleware/catalog-origin');
const { crudRouter } = require('../../lib/crud');
const orders = require('../../controllers/orders/OrderController');

const router = express.Router();
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

const view = requirePermission('orders.view', 'orders.manage');
const manage = [requirePermission('orders.manage'), requireCatalogWriteOrigin];
const create = [requirePermission('orders.create', 'orders.manage'), requireCatalogWriteOrigin];

router.get('/meta', view, orders.orderMeta);
router.get('/processing-report', requirePermission('orders.view', 'reports.view'), orders.processingReport);
router.get('/invoices', view, orders.invoices);
router.get('/drafts', requirePermission('drafts.view', 'orders.manage'), orders.listDrafts);
router.patch('/drafts/:id/dismiss', requirePermission('drafts.view', 'orders.manage'), requireCatalogWriteOrigin, orders.dismissDraft);

const writeOnly = (mw) => (req, res, next) => (['GET', 'HEAD', 'OPTIONS'].includes(req.method) ? next() : mw(req, res, next));
// Order sources and processing notes are master data managed by order staff.
router.use('/sources', requirePermission('orders.manage'), writeOnly(requireCatalogWriteOrigin), crudRouter({
  table: 'order_sources', entity: 'order_source', orderBy: 't.sort_order, t.id',
  fields: [
    { name: 'code', required: true, max: 40, pattern: /^[a-z][a-z0-9_]{1,39}$/, label: 'Code' },
    { name: 'name', required: true, max: 80, label: 'Name' },
    { name: 'sort_order', type: 'int', default: 0 },
    { name: 'is_active', type: 'bool', default: 1 },
  ],
}));
router.use('/note-presets', requirePermission('orders.manage'), writeOnly(requireCatalogWriteOrigin), crudRouter({
  table: 'note_presets', entity: 'note_preset', searchColumns: ['text'], orderBy: 't.sort_order, t.id', filters: { kind: 'kind' },
  fields: [
    { name: 'kind', type: 'enum', values: ['internal', 'courier', 'cancel'], required: true, label: 'Type' },
    { name: 'text', required: true, max: 255, label: 'Text' },
    { name: 'sort_order', type: 'int', default: 0 },
    { name: 'is_active', type: 'bool', default: 1 },
  ],
}));

router.get('/', view, orders.listOrders);
router.post('/', ...create, orders.createManualOrder);
router.post('/exchange', ...create, orders.createExchangeOrder);
router.post('/bulk', ...manage, orders.bulkAction);
router.get('/:id', view, orders.getOrderDetail);
router.put('/:id', ...manage, orders.updateOrder);
router.patch('/:id/status', ...manage, orders.changeOrderStatus);
router.post('/:id/notes', ...manage, orders.addNote);
router.patch('/:id/assign', ...manage, orders.assignOrder);

module.exports = router;
