'use strict';

/**
 * Master defaults the new modules need to function: order sources, delivery
 * zones, cities, a default cash account, accounting purposes, role templates,
 * site settings, starter CMS pages and note presets. Idempotent.
 */
const { CITIES } = require('../src/services/orders/order-policy');
const { ROLE_TEMPLATES } = require('../src/auth/permissions');

async function up(queryInterface) {
  const sequelize = queryInterface.sequelize;
  const run = (sql, replacements) => sequelize.query(sql, { replacements });
  const count = async (table) => Number((await sequelize.query(`SELECT COUNT(*) AS n FROM ${table}`, { type: 'SELECT' }))[0].n);

  if (!(await count('order_sources'))) {
    const sources = [['website', 'Website'], ['facebook', 'Facebook'], ['instagram', 'Instagram'],
      ['whatsapp', 'WhatsApp'], ['phone', 'Phone call'], ['pos', 'POS'], ['other', 'Other']];
    for (const [i, [code, name]] of sources.entries()) {
      await run('INSERT INTO order_sources (code, name, sort_order) VALUES (?, ?, ?)', [code, name, i]);
    }
  }

  if (!(await count('delivery_zones'))) {
    await run("INSERT INTO delivery_zones (code, name, charge, sort_order) VALUES ('inside_dhaka', 'Inside Dhaka', 70, 1), ('outside_dhaka', 'Outside Dhaka', 120, 2)");
    const zones = await sequelize.query('SELECT id, code FROM delivery_zones', { type: 'SELECT' });
    const byCode = Object.fromEntries(zones.map((z) => [z.code, z.id]));
    for (const city of CITIES) {
      await run('INSERT IGNORE INTO delivery_cities (zone_id, name) VALUES (?, ?)',
        [city === 'Dhaka' ? byCode.inside_dhaka : byCode.outside_dhaka, city]);
    }
  }

  if (!(await count('accounts'))) {
    await run("INSERT INTO accounts (name, type, opening_balance, is_default) VALUES ('Cash in hand', 'cash', 0, 1)");
  }

  if (!(await count('account_purposes'))) {
    const purposes = [
      ['Sales', 'income', 1], ['Other income', 'income', 0],
      ['Purchase', 'expense', 1], ['Salary', 'expense', 1], ['Rent', 'expense', 0],
      ['Utilities', 'expense', 0], ['Marketing', 'expense', 0], ['Delivery cost', 'expense', 0],
      ['Damage loss', 'expense', 1], ['Other expense', 'expense', 0],
    ];
    for (const [name, kind, system] of purposes) {
      await run('INSERT IGNORE INTO account_purposes (name, kind, is_system) VALUES (?, ?, ?)', [name, kind, system]);
    }
  }

  if (!(await count('note_presets'))) {
    const presets = [
      ['internal', 'Customer asked to deliver in the evening'], ['internal', 'Call before delivery'],
      ['internal', 'Address needs confirmation'], ['courier', 'Handle with care'],
      ['courier', 'Collect exact amount only'], ['courier', 'Call customer before arrival'],
      ['cancel', 'Customer cancelled'], ['cancel', 'Unreachable by phone'],
      ['cancel', 'Fake or duplicate order'], ['cancel', 'Out of stock'],
    ];
    for (const [i, [kind, text]] of presets.entries()) {
      await run('INSERT INTO note_presets (kind, text, sort_order) VALUES (?, ?, ?)', [kind, text, i]);
    }
  }

  for (const [code, template] of Object.entries(ROLE_TEMPLATES)) {
    await run('INSERT IGNORE INTO admin_roles (code, name, description, is_system) VALUES (?, ?, ?, 0)',
      [code, template.name, template.description]);
    const [role] = await sequelize.query('SELECT id FROM admin_roles WHERE code = ?', { replacements: [code], type: 'SELECT' });
    for (const permission of template.permissions) {
      await run('INSERT IGNORE INTO role_permissions (role_id, permission) VALUES (?, ?)', [role.id, permission]);
    }
  }
  await run("UPDATE admin_roles SET is_system = 1, description = COALESCE(description, 'Full access') WHERE code = 'super_admin'");

  const settings = {
    site_name: 'Aayash E-Mart',
    site_tagline: 'Everything you need, all in one place.',
    logo_url: '/logo.png',
    favicon_url: '',
    theme_primary: '#FF9933',
    theme_accent: '#A65A3E',
    theme_footer_bg: '#5D3D29',
    font_family: 'Roboto',
    contact_phone: '',
    contact_email: 'hello@aayashemart.com',
    contact_address: 'Dhaka, Bangladesh',
    invoice_address: 'Dhaka, Bangladesh',
    invoice_footer: 'Thank you for shopping with us.',
    footer_about: 'Everything you need, all in one place.',
    footer_copyright: 'Aayash E-Mart',
    social_facebook: '',
    social_instagram: '',
    social_youtube: '',
    social_whatsapp: '',
    hero_title: 'Fresh groceries, ordered with ease.',
    hero_text: 'Explore food and pantry essentials. Delivery availability and timing are confirmed after ordering.',
    currency_symbol: '৳',
    free_delivery_min_order: '',
    pixel_enabled: '0',
    pixel_id: '',
    capi_enabled: '0',
    capi_test_code: '',
    google_login_enabled: '0',
    facebook_login_enabled: '0',
    low_stock_default: '5',
    default_sales_account_id: '',
  };
  for (const [key, value] of Object.entries(settings)) {
    await run('INSERT IGNORE INTO site_settings (setting_key, setting_value) VALUES (?, ?)', [key, value]);
  }
  const [cash] = await sequelize.query("SELECT id FROM accounts WHERE is_default = 1 LIMIT 1", { type: 'SELECT' });
  if (cash) {
    await run("UPDATE site_settings SET setting_value = ? WHERE setting_key = 'default_sales_account_id' AND (setting_value IS NULL OR setting_value = '')", [String(cash.id)]);
  }

  if (!(await count('cms_pages'))) {
    const pages = [
      ['about-us', 'About us', 'Aayash E-Mart is an online grocery store delivering fresh food and pantry staples.\n\nEdit this page from Admin → Website → Pages.'],
      ['delivery-policy', 'Delivery policy', 'We deliver across Bangladesh. Delivery charges depend on your district and are shown at checkout.'],
      ['refund-policy', 'Refund and return policy', 'If an item arrives damaged or incorrect, contact us as soon as possible and we will arrange a replacement or refund.'],
      ['privacy-policy', 'Privacy policy', 'We collect only the information needed to deliver your order and never sell your personal data.'],
      ['terms', 'Terms and conditions', 'By placing an order you agree to these terms. Edit this page from the admin panel.'],
    ];
    for (const [i, [slug, title, body]] of pages.entries()) {
      await run('INSERT INTO cms_pages (slug, title, body, sort_order) VALUES (?, ?, ?, ?)', [slug, title, body, i]);
    }
  }

  if (!(await count('menu_links'))) {
    const links = [
      ['header', null, 'Home', '/', 1], ['header', null, 'Shop all', '/products', 2],
      ['header', null, 'Deals', '/products?deal=1', 3], ['header', null, 'Track order', '/orders/tracking', 4],
      ['footer', 'Shop', 'All products', '/products', 1], ['footer', 'Shop', 'Deals', '/products?deal=1', 2],
      ['footer', 'Shop', 'Your cart', '/cart', 3], ['footer', 'Help', 'Track your order', '/orders/tracking', 1],
      ['footer', 'Help', 'Contact us', '/contact', 2],
    ];
    for (const [location, group, label, url, sort] of links) {
      await run('INSERT INTO menu_links (location, group_name, label, url, sort_order) VALUES (?, ?, ?, ?, ?)', [location, group, label, url, sort]);
    }
  }

  // Existing reviews were already public: keep them visible.
  await run("UPDATE reviews SET status = 'approved' WHERE status = 'pending' AND created_at < NOW() - INTERVAL 1 SECOND");
  await run("UPDATE product_variants SET barcode = sku WHERE barcode IS NULL");

  // Opening ledger rows so every unit of existing stock is explained.
  await run(`INSERT INTO stock_movements (variant_id, product_id, movement_type, qty_change, balance_after, note)
    SELECT v.id, v.product_id, 'opening', v.stock, v.stock, 'Opening balance'
    FROM product_variants v
    WHERE v.stock > 0 AND NOT EXISTS (SELECT 1 FROM stock_movements m WHERE m.variant_id = v.id)`);
}

module.exports = { up };
