'use strict';

const express = require('express');
const { requirePermission } = require('../../../auth/access');
const { requireCatalogWriteOrigin } = require('../../../middleware/catalog-origin');
const inv = require('../../../controllers/ops/InventoryController');
const pur = require('../../../controllers/ops/PurchaseController');
const acc = require('../../../controllers/ops/AccountsController');
const pos = require('../../../controllers/ops/PosController');
const cust = require('../../../controllers/ops/CustomerController');
const eng = require('../../../controllers/ops/EngagementController');
const adm = require('../../../controllers/ops/AdminUserController');
const rep = require('../../../controllers/ops/ReportController');
const site = require('../../../controllers/ops/SiteController');
const capi = require('../../../services/marketing/capi');
const { route } = require('../../../lib/http');
const { pool } = require('../../../../db');

const router = express.Router();
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
const W = requireCatalogWriteOrigin;
const P = requirePermission;

// ---- dashboard & reports
router.get('/dashboard', P('dashboard.view'), rep.dashboard);
router.get('/reports/sales', P('reports.view'), rep.salesReport);
router.get('/reports/profit-loss', P('reports.view'), rep.profitLoss);
router.get('/reports/stock', P('reports.view', 'stock.view'), rep.stockSummary);
router.get('/reports/couriers', P('reports.view'), rep.courierReport);

// ---- inventory / product extras
router.get('/products', P('products.view', 'products.manage', 'stock.view'), inv.listProducts);
router.get('/products/export', P('products.view', 'products.manage'), inv.exportProducts);
router.get('/products/views-report', P('products.view', 'reports.view'), inv.viewsReport);
router.post('/products/reorder', P('products.manage'), W, inv.reorder);
router.patch('/products/:id/meta', P('products.manage'), W, inv.updateMeta);
router.get('/variants', P('products.view', 'products.manage', 'stock.view', 'pos.use', 'purchases.manage', 'orders.create', 'orders.manage', 'combos.manage', 'marketing.manage'), inv.listVariants);
router.patch('/variants/:id', P('products.manage', 'stock.manage'), W, inv.updateVariant);
router.get('/stock/low', P('stock.view', 'products.view'), inv.lowStock);
router.get('/stock/ledger', P('stock.view', 'reports.view'), inv.ledger);
router.post('/stock/adjust', P('stock.manage'), W, inv.adjustStock);
router.get('/damages', P('stock.view', 'stock.manage'), inv.listDamages);
router.post('/damages', P('stock.manage'), W, inv.createDamage);
router.get('/combos', P('combos.manage', 'products.view'), inv.listCombos);
router.get('/combos/:id', P('combos.manage', 'products.view'), inv.getCombo);
router.post('/combos', P('combos.manage'), W, inv.createCombo);
router.put('/combos/:id', P('combos.manage'), W, inv.updateCombo);

// ---- POS
router.post('/pos/sale', P('pos.use'), W, pos.sale);
router.get('/pos/sales', P('pos.use'), pos.listSales);
router.post('/pos/sales/:id/return', P('pos.use'), W, pos.returnSale);
router.get('/pos/accounts', P('pos.use'), acc.listAccounts);

// ---- suppliers & purchases
router.get('/suppliers', P('purchases.manage'), pur.listSuppliers);
router.get('/suppliers/:id', P('purchases.manage'), pur.getSupplier);
router.post('/suppliers', P('purchases.manage'), W, pur.createSupplier);
router.put('/suppliers/:id', P('purchases.manage'), W, pur.updateSupplier);
router.delete('/suppliers/:id', P('purchases.manage'), W, pur.deleteSupplier);
router.post('/suppliers/:id/pay', P('purchases.manage'), W, pur.paySupplier);
router.get('/purchases', P('purchases.manage'), pur.listPurchases);
router.get('/purchases/:id', P('purchases.manage'), pur.getPurchase);
router.post('/purchases', P('purchases.manage'), W, pur.createPurchase);
router.post('/purchases/:id/cancel', P('purchases.manage'), W, pur.cancelPurchase);

// ---- accounts
const AV = P('accounts.view', 'accounts.manage');
const AM = [P('accounts.manage'), W];
router.get('/accounts/overview', AV, acc.overview);
router.get('/accounts', AV, acc.listAccounts);
router.post('/accounts', ...AM, acc.createAccount);
router.put('/accounts/:id', ...AM, acc.updateAccount);
router.delete('/accounts/:id', ...AM, acc.deleteAccount);
router.get('/purposes', AV, acc.listPurposes);
router.post('/purposes', ...AM, acc.createPurpose);
router.put('/purposes/:id', ...AM, acc.updatePurpose);
router.delete('/purposes/:id', ...AM, acc.deletePurpose);
router.get('/transactions', AV, acc.listTransactions);
router.post('/transactions', ...AM, acc.createTransaction);
router.delete('/transactions/:id', ...AM, acc.deleteTransaction);
router.get('/transfers', AV, acc.listTransfers);
router.post('/transfers', ...AM, acc.createTransfer);
router.get('/dues', AV, acc.listDues);
router.post('/dues', ...AM, acc.createDue);
router.put('/dues/:id', ...AM, acc.updateDue);
router.delete('/dues/:id', ...AM, acc.deleteDue);
router.post('/dues/:id/pay', ...AM, acc.payDue);
router.get('/employees', AV, acc.listEmployees);
router.post('/employees', ...AM, acc.createEmployee);
router.put('/employees/:id', ...AM, acc.updateEmployee);
router.get('/salary', AV, acc.listSalary);
router.post('/salary', ...AM, acc.paySalary);
router.get('/bills', AV, acc.listBills);
router.post('/bills', ...AM, acc.createBill);
router.put('/bills/:id', ...AM, acc.updateBill);
router.delete('/bills/:id', ...AM, acc.deleteBill);
router.post('/bills/:id/pay', ...AM, acc.payBill);

// ---- customers
router.get('/customers', P('customers.view', 'customers.manage'), cust.list);
router.get('/customers/:id', P('customers.view', 'customers.manage'), cust.detail);
router.put('/customers/:id', P('customers.manage'), W, cust.update);
router.post('/customers/:id/block', P('customers.manage'), W, cust.block);
router.post('/customers/:id/unblock', P('customers.manage'), W, cust.unblock);
router.get('/blocklist', P('customers.view', 'customers.manage'), cust.listBlocklist);
router.post('/blocklist', P('customers.manage'), W, cust.addBlock);
router.delete('/blocklist/:id', P('customers.manage'), W, cust.removeBlock);

// ---- messages, subscribers, reviews
router.get('/messages', P('messages.manage'), eng.listMessages);
router.patch('/messages/:id', P('messages.manage'), W, eng.updateMessage);
router.delete('/messages/:id', P('messages.manage'), W, eng.deleteMessage);
router.get('/subscribers', P('messages.manage'), eng.listSubscribers);
router.delete('/subscribers/:id', P('messages.manage'), W, eng.deleteSubscriber);
router.get('/reviews', P('reviews.manage'), eng.listReviews);
router.patch('/reviews/:id', P('reviews.manage'), W, eng.moderateReview);
router.delete('/reviews/:id', P('reviews.manage'), W, eng.deleteReview);

// ---- admins, roles
router.get('/permissions', P('admins.manage'), adm.permissionCatalog);
router.get('/roles', P('admins.manage'), adm.listRoles);
router.post('/roles', P('admins.manage'), W, adm.createRole);
router.put('/roles/:id', P('admins.manage'), W, adm.updateRole);
router.delete('/roles/:id', P('admins.manage'), W, adm.deleteRole);
router.get('/admins', P('admins.manage'), adm.listAdmins);
router.post('/admins', P('admins.manage'), W, adm.createAdmin);
router.put('/admins/:id', P('admins.manage'), W, adm.updateAdmin);
router.post('/admins/:id/reset-password', P('admins.manage'), W, adm.resetPassword);
router.get('/activity', P('admins.manage'), adm.activity);
router.post('/me/password', P(), W, adm.changeOwnPassword);

// ---- settings (general vs website vs marketing are separate permissions)
router.get('/settings', P('settings.manage', 'website.manage', 'marketing.manage'), site.getSettings);
router.put('/settings/general', P('settings.manage'), W, site.onlyGroups('general', 'delivery', 'invoice', 'login'), site.putSettings);
router.put('/settings/website', P('website.manage'), W, site.onlyGroups('theme', 'home', 'footer', 'general', 'delivery'), site.putSettings);
router.put('/settings/marketing', P('marketing.manage'), W, site.onlyGroups('marketing'), site.putSettings);

router.get('/capi-events', P('marketing.manage'), route(async (_req, res) => {
  const [rows] = await pool.query('SELECT id, event_id, event_name, order_id, status, attempts, response, created_at FROM capi_events ORDER BY id DESC LIMIT 100');
  res.json({ items: rows });
}));
router.post('/capi-events/retry', P('marketing.manage'), W, route(async (_req, res) => res.json({ retried: await capi.retryFailed() })));

router.use('/cms', require('./cms'));
router.use('/locations', require('./locations'));

module.exports = router;
