'use strict';

// Every permission code, grouped by module. The admin UI renders these groups
// as the role editor. super_admin always has every permission.
const PERMISSION_GROUPS = [
  ['Dashboard', [['dashboard.view', 'View dashboard']]],
  ['Orders', [
    ['orders.view', 'View orders'],
    ['orders.manage', 'Change status, notes, bulk actions'],
    ['orders.create', 'Create manual / exchange orders'],
    ['drafts.view', 'View incomplete orders'],
  ]],
  ['POS', [['pos.use', 'Use point of sale']]],
  ['Catalog', [
    ['products.view', 'View products'],
    ['products.manage', 'Create / edit products and masters'],
    ['combos.manage', 'Manage combo products'],
  ]],
  ['Inventory', [
    ['stock.view', 'View stock and low stock'],
    ['stock.manage', 'Damage entries and stock adjustments'],
    ['purchases.manage', 'Purchases and suppliers'],
  ]],
  ['Customers', [
    ['customers.view', 'View customers'],
    ['customers.manage', 'Block / edit customers'],
  ]],
  ['Accounts', [
    ['accounts.view', 'View accounts'],
    ['accounts.manage', 'Income, expense, transfers, salary, bills'],
  ]],
  ['Reports', [['reports.view', 'View reports']]],
  ['Website', [
    ['website.manage', 'Pages, sliders, banners, menus, theme, footer'],
    ['marketing.manage', 'Pixel, tags, landing pages'],
    ['reviews.manage', 'Moderate reviews'],
    ['messages.manage', 'Messages and newsletter'],
  ]],
  ['Delivery', [
    ['locations.manage', 'Zones, cities, areas, charges'],
    ['couriers.manage', 'Couriers and API settings'],
  ]],
  ['Administration', [
    ['admins.manage', 'Admins, roles and permissions'],
    ['settings.manage', 'General settings'],
  ]],
];

const ALL_PERMISSIONS = PERMISSION_GROUPS.flatMap(([, items]) => items.map(([code]) => code));

const ROLE_TEMPLATES = {
  manager: {
    name: 'Manager',
    description: 'Everything except admin accounts and settings',
    permissions: ALL_PERMISSIONS.filter((p) => !['admins.manage', 'settings.manage'].includes(p)),
  },
  order_staff: {
    name: 'Order staff',
    description: 'Handles orders, customers and POS',
    permissions: ['dashboard.view', 'orders.view', 'orders.manage', 'orders.create', 'drafts.view',
      'pos.use', 'customers.view', 'products.view', 'stock.view', 'couriers.manage'],
  },
  accountant: {
    name: 'Accountant',
    description: 'Accounts, purchases and reports',
    permissions: ['dashboard.view', 'accounts.view', 'accounts.manage', 'reports.view',
      'purchases.manage', 'stock.view', 'orders.view'],
  },
  content_editor: {
    name: 'Content editor',
    description: 'Website content and catalog',
    permissions: ['dashboard.view', 'website.manage', 'marketing.manage', 'reviews.manage',
      'messages.manage', 'products.view', 'products.manage', 'combos.manage'],
  },
};

module.exports = { PERMISSION_GROUPS, ALL_PERMISSIONS, ROLE_TEMPLATES };
