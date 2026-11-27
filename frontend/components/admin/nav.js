// Admin navigation: groups with submenus. `perm` = any-of permission codes (empty = everyone signed in).
export const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '/admin', perm: ['dashboard.view'] },
  {
    id: 'orders', label: 'Orders', icon: 'orders', perm: ['orders.view', 'orders.manage', 'drafts.view'], children: [
      { href: '/admin/orders', label: 'All orders', perm: ['orders.view', 'orders.manage'] },
      { href: '/admin/orders/new', label: 'Create order', perm: ['orders.create', 'orders.manage'] },
      { href: '/admin/orders/incomplete', label: 'Incomplete orders', perm: ['drafts.view', 'orders.manage'] },
      { href: '/admin/orders/report', label: 'Processing report', perm: ['orders.view', 'orders.manage'] },
      { href: '/admin/orders/setup', label: 'Sources & note presets', perm: ['orders.manage'] },
    ],
  },
  {
    id: 'delivery', label: 'Delivery', icon: 'truck', perm: ['couriers.manage', 'orders.manage', 'locations.manage'], children: [
      { href: '/admin/shipments', label: 'Shipments', perm: ['couriers.manage', 'orders.manage'] },
      { href: '/admin/couriers', label: 'Couriers', perm: ['couriers.manage'] },
      { href: '/admin/couriers/api', label: 'Courier API keys', perm: ['couriers.manage'] },
      { href: '/admin/delivery', label: 'Zones, cities & areas', perm: ['locations.manage'] },
      { href: '/admin/reports/couriers', label: 'Courier report', perm: ['reports.view'] },
    ],
  },
  {
    id: 'pos', label: 'POS', icon: 'pos', perm: ['pos.use'], children: [
      { href: '/admin/pos', label: 'New sale' },
      { href: '/admin/pos/sales', label: 'Sales & returns' },
    ],
  },
  {
    id: 'products', label: 'Products', icon: 'box', perm: ['products.view', 'products.manage', 'combos.manage'], children: [
      { href: '/admin/products', label: 'All products', perm: ['products.view', 'products.manage'] },
      { href: '/admin/combos', label: 'Combo packs', perm: ['combos.manage'] },
      { href: '/admin/categories', label: 'Categories', perm: ['products.view', 'products.manage'] },
      { href: '/admin/brands', label: 'Brands', perm: ['products.view', 'products.manage'] },
      { href: '/admin/product-types', label: 'Product types', perm: ['products.view', 'products.manage'] },
      { href: '/admin/attributes', label: 'Attributes', perm: ['products.view', 'products.manage'] },
      { href: '/admin/products/arrange', label: 'Position & flags', perm: ['products.manage'] },
      { href: '/admin/products/views', label: 'Product views', perm: ['products.view', 'reports.view'] },
    ],
  },
  {
    id: 'stock', label: 'Inventory', icon: 'warehouse', perm: ['stock.view', 'stock.manage'], children: [
      { href: '/admin/stock', label: 'Stock levels' },
      { href: '/admin/stock/low', label: 'Low stock' },
      { href: '/admin/stock/ledger', label: 'Stock ledger' },
      { href: '/admin/stock/damage', label: 'Damage & loss' },
      { href: '/admin/stock/barcodes', label: 'Barcode labels' },
    ],
  },
  {
    id: 'purchases', label: 'Purchases', icon: 'cart', perm: ['purchases.manage'], children: [
      { href: '/admin/purchases', label: 'Purchases' },
      { href: '/admin/purchases/new', label: 'New purchase' },
      { href: '/admin/suppliers', label: 'Suppliers' },
    ],
  },
  {
    id: 'accounts', label: 'Accounts', icon: 'wallet', perm: ['accounts.view', 'accounts.manage'], children: [
      { href: '/admin/accounts', label: 'Overview' },
      { href: '/admin/accounts/transactions', label: 'Income & expense' },
      { href: '/admin/accounts/transfers', label: 'Fund transfers' },
      { href: '/admin/accounts/dues', label: 'Dues' },
      { href: '/admin/accounts/salary', label: 'Employees & salary' },
      { href: '/admin/accounts/bills', label: 'Bills' },
      { href: '/admin/accounts/setup', label: 'Accounts & purposes' },
    ],
  },
  {
    id: 'customers', label: 'Customers', icon: 'users', perm: ['customers.view', 'customers.manage', 'reviews.manage', 'messages.manage'], children: [
      { href: '/admin/customers', label: 'All customers', perm: ['customers.view', 'customers.manage'] },
      { href: '/admin/customers/blocklist', label: 'Blocklist', perm: ['customers.view', 'customers.manage'] },
      { href: '/admin/reviews', label: 'Reviews', perm: ['reviews.manage'] },
      { href: '/admin/messages', label: 'Messages', perm: ['messages.manage'] },
      { href: '/admin/subscribers', label: 'Newsletter', perm: ['messages.manage'] },
    ],
  },
  {
    id: 'reports', label: 'Reports', icon: 'chart', perm: ['reports.view'], children: [
      { href: '/admin/reports/sales', label: 'Sales' },
      { href: '/admin/reports/profit-loss', label: 'Profit & loss' },
      { href: '/admin/reports/stock', label: 'Stock value' },
    ],
  },
  {
    id: 'website', label: 'Website', icon: 'globe', perm: ['website.manage'], children: [
      { href: '/admin/website/theme', label: 'Theme & footer' },
      { href: '/admin/website/sliders', label: 'Sliders' },
      { href: '/admin/website/banners', label: 'Banners' },
      { href: '/admin/website/pages', label: 'Pages' },
      { href: '/admin/website/menus', label: 'Menus' },
    ],
  },
  {
    id: 'marketing', label: 'Marketing', icon: 'megaphone', perm: ['marketing.manage'], children: [
      { href: '/admin/marketing', label: 'Pixel & Conversions API' },
      { href: '/admin/marketing/tags', label: 'Tracking tags' },
      { href: '/admin/marketing/landing-pages', label: 'Landing pages' },
    ],
  },
  {
    id: 'settings', label: 'Settings', icon: 'settings', perm: [], children: [
      { href: '/admin/settings', label: 'General', perm: ['settings.manage'] },
      { href: '/admin/settings/invoice', label: 'Invoice', perm: ['settings.manage'] },
      { href: '/admin/settings/login', label: 'Customer login', perm: ['settings.manage'] },
      { href: '/admin/team', label: 'Team', perm: ['admins.manage'] },
      { href: '/admin/team/roles', label: 'Roles & permissions', perm: ['admins.manage'] },
      { href: '/admin/team/activity', label: 'Activity log', perm: ['admins.manage'] },
      { href: '/admin/account', label: 'My account' },
    ],
  },
];

export const isActive = (pathname, href) => (href === '/admin' ? pathname === '/admin' : pathname === href || pathname.startsWith(`${href}/`));

const allowed = (perm, can) => !perm || perm.length === 0 || can(...perm);

/** Menu filtered by what this admin may do. Groups with no visible children are dropped. */
export function visibleNav(can) {
  return NAV.map((g) => {
    if (!g.children) return allowed(g.perm, can) ? g : null;
    const children = g.children.filter((c) => allowed(c.perm || g.perm, can));
    return children.length ? { ...g, children } : null;
  }).filter(Boolean);
}

export function flatItems(nav) {
  return nav.flatMap((g) => (g.children ? g.children.map((c) => ({ ...c, group: g.label, icon: g.icon })) : [{ href: g.href, label: g.label, group: '', icon: g.icon }]));
}

/** Current page title: the most specific nav match. */
export function titleFor(pathname, nav) {
  const items = flatItems(nav).filter((i) => isActive(pathname, i.href)).sort((a, b) => b.href.length - a.href.length);
  return items[0]?.label || 'Admin';
}
