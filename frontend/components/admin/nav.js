export const NAV = [
  { href: '/admin', label: 'Dashboard', icon: 'dashboard' },
  { href: '/admin/orders', label: 'Orders', icon: 'orders' },
  { href: '/admin/products', label: 'Products', icon: 'products' },
  { href: '/admin/categories', label: 'Categories', icon: 'categories' },
  { href: '/admin/brands', label: 'Brands', icon: 'brands' },
  { href: '/admin/product-types', label: 'Product Types', icon: 'products' },
  { href: '/admin/attributes', label: 'Attributes', icon: 'brands' },
  { href: '/admin/reports', label: 'Reports', icon: 'reports' },
  { href: '/admin/messages', label: 'Messages', icon: 'messages' },
  { href: '/admin/customers', label: 'Customers', icon: 'customers' },
];

export const isActive = (pathname, href) => (href === '/admin' ? pathname === '/admin' : pathname.startsWith(href));
