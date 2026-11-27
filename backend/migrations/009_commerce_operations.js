'use strict';

/**
 * Operations schema: extended order workflow, locations, stock ledger,
 * purchasing, accounts, CMS, marketing, roles/permissions, customers.
 * Additive only. Existing rows are preserved.
 */

const ENGINE = 'ENGINE=InnoDB DEFAULT CHARSET=utf8mb4';

const ORDER_STATUSES = [
  'placed', 'pending', 'confirmed', 'wfp', 'packaging', 'packed',
  'out_for_delivery', 'partial_delivered', 'delivered',
  'return_pending', 'returned', 'cancelled',
];

async function up(queryInterface) {
  const sequelize = queryInterface.sequelize;
  const run = (sql, replacements) => sequelize.query(sql, { replacements });

  async function addColumns(table, columns) {
    const existing = await queryInterface.describeTable(table);
    for (const [name, ddl] of Object.entries(columns)) {
      if (!existing[name]) {
        await run(`ALTER TABLE \`${table}\` ADD COLUMN \`${name}\` ${ddl}`);
      }
    }
  }

  async function addIndex(table, name, columns, unique = false) {
    const indexes = await queryInterface.showIndex(table);
    if (!indexes.some((index) => index.name === name)) {
      await run(`ALTER TABLE \`${table}\` ADD ${unique ? 'UNIQUE ' : ''}INDEX \`${name}\` (${columns})`);
    }
  }

  // ---------------------------------------------------------------- orders
  await run(`ALTER TABLE orders MODIFY status ENUM(${ORDER_STATUSES.map((s) => `'${s}'`).join(',')}) NOT NULL DEFAULT 'placed'`);
  await addColumns('orders', {
    order_type: "ENUM('online','pos','exchange','manual') NOT NULL DEFAULT 'online'",
    source: "VARCHAR(40) NOT NULL DEFAULT 'website'",
    guest_email: 'VARCHAR(190) NULL',
    zone_id: 'INT UNSIGNED NULL',
    city_id: 'INT UNSIGNED NULL',
    area_id: 'INT UNSIGNED NULL',
    paid_amount: 'DECIMAL(12,2) NOT NULL DEFAULT 0',
    collected_amount: 'DECIMAL(12,2) NULL',
    account_id: 'INT UNSIGNED NULL',
    parent_order_id: 'INT UNSIGNED NULL',
    landing_page_id: 'INT UNSIGNED NULL',
    created_by_admin_id: 'INT UNSIGNED NULL',
    assigned_admin_id: 'INT UNSIGNED NULL',
    ip_address: 'VARCHAR(64) NULL',
    cancel_reason: 'VARCHAR(255) NULL',
    invoice_printed_at: 'DATETIME NULL',
    updated_at: 'DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP',
  });
  await addIndex('orders', 'idx_orders_type_status', 'order_type, status');
  await addIndex('orders', 'idx_orders_source', 'source');
  await addIndex('orders', 'idx_orders_customer', 'customer_id');
  await addColumns('order_items', {
    delivered_qty: 'INT UNSIGNED NULL',
    unit_cost: 'DECIMAL(12,2) NULL',
    is_combo: 'TINYINT(1) NOT NULL DEFAULT 0',
  });

  await run(`CREATE TABLE IF NOT EXISTS order_notes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    kind ENUM('internal','courier','customer') NOT NULL DEFAULT 'internal',
    note VARCHAR(1000) NOT NULL,
    admin_id INT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_order_notes_order (order_id, id),
    CONSTRAINT fk_order_notes_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_order_notes_admin FOREIGN KEY (admin_id) REFERENCES admin_users(id) ON DELETE SET NULL
  ) ${ENGINE}`);

  await run(`CREATE TABLE IF NOT EXISTS note_presets (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    kind ENUM('internal','courier','cancel') NOT NULL DEFAULT 'internal',
    text VARCHAR(255) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ${ENGINE}`);

  await run(`CREATE TABLE IF NOT EXISTS order_sources (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(40) NOT NULL UNIQUE,
    name VARCHAR(80) NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0
  ) ${ENGINE}`);

  await run(`CREATE TABLE IF NOT EXISTS checkout_drafts (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    draft_token CHAR(64) NOT NULL UNIQUE,
    name VARCHAR(120) NULL,
    phone VARCHAR(30) NULL,
    address_line VARCHAR(255) NULL,
    city VARCHAR(120) NULL,
    items_json JSON NULL,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    ip_address VARCHAR(64) NULL,
    status ENUM('open','converted','dismissed') NOT NULL DEFAULT 'open',
    order_id INT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_drafts_status (status, updated_at),
    INDEX idx_drafts_phone (phone)
  ) ${ENGINE}`);

  // ------------------------------------------------------------- locations
  await run(`CREATE TABLE IF NOT EXISTS delivery_zones (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(40) NOT NULL UNIQUE,
    name VARCHAR(120) NOT NULL,
    charge DECIMAL(10,2) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0
  ) ${ENGINE}`);
  await run(`CREATE TABLE IF NOT EXISTS delivery_cities (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    zone_id INT UNSIGNED NOT NULL,
    name VARCHAR(120) NOT NULL UNIQUE,
    charge_override DECIMAL(10,2) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    CONSTRAINT fk_cities_zone FOREIGN KEY (zone_id) REFERENCES delivery_zones(id) ON DELETE RESTRICT
  ) ${ENGINE}`);
  await run(`CREATE TABLE IF NOT EXISTS delivery_areas (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    city_id INT UNSIGNED NOT NULL,
    name VARCHAR(120) NOT NULL,
    charge_override DECIMAL(10,2) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    UNIQUE KEY uq_area (city_id, name),
    CONSTRAINT fk_areas_city FOREIGN KEY (city_id) REFERENCES delivery_cities(id) ON DELETE CASCADE
  ) ${ENGINE}`);

  // -------------------------------------------------- products & inventory
  await addColumns('products', {
    sort_position: 'INT NOT NULL DEFAULT 0',
    is_free_delivery: 'TINYINT(1) NOT NULL DEFAULT 0',
    is_combo: 'TINYINT(1) NOT NULL DEFAULT 0',
    view_count: 'INT UNSIGNED NOT NULL DEFAULT 0',
    low_stock_level: 'INT UNSIGNED NOT NULL DEFAULT 5',
    meta_title: 'VARCHAR(160) NULL',
    meta_description: 'VARCHAR(300) NULL',
  });
  await addColumns('product_variants', {
    cost_price: 'DECIMAL(12,2) NOT NULL DEFAULT 0',
    barcode: 'VARCHAR(64) NULL',
  });
  await addIndex('products', 'idx_products_position', 'sort_position, id');

  await run(`CREATE TABLE IF NOT EXISTS product_views_daily (
    product_id INT UNSIGNED NOT NULL,
    view_date DATE NOT NULL,
    views INT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (product_id, view_date),
    CONSTRAINT fk_pvd_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
  ) ${ENGINE}`);

  await run(`CREATE TABLE IF NOT EXISTS combo_items (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    combo_product_id INT UNSIGNED NOT NULL,
    variant_id INT UNSIGNED NOT NULL,
    qty INT UNSIGNED NOT NULL DEFAULT 1,
    UNIQUE KEY uq_combo_variant (combo_product_id, variant_id),
    CONSTRAINT fk_combo_product FOREIGN KEY (combo_product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT fk_combo_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT
  ) ${ENGINE}`);

  await run(`CREATE TABLE IF NOT EXISTS stock_movements (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    variant_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    movement_type ENUM('opening','purchase','sale','pos_sale','cancel_restock','return_restock','damage','adjustment','exchange') NOT NULL,
    qty_change INT NOT NULL,
    balance_after INT NOT NULL,
    unit_cost DECIMAL(12,2) NULL,
    ref_type VARCHAR(30) NULL,
    ref_id BIGINT UNSIGNED NULL,
    note VARCHAR(255) NULL,
    admin_id INT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_stock_variant (variant_id, id),
    INDEX idx_stock_product (product_id, created_at),
    INDEX idx_stock_type (movement_type, created_at),
    INDEX idx_stock_ref (ref_type, ref_id)
  ) ${ENGINE}`);

  await run(`CREATE TABLE IF NOT EXISTS damage_records (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    variant_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    qty INT UNSIGNED NOT NULL,
    unit_cost DECIMAL(12,2) NOT NULL DEFAULT 0,
    reason VARCHAR(255) NULL,
    admin_id INT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_damage_created (created_at),
    CONSTRAINT fk_damage_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT
  ) ${ENGINE}`);

  // --------------------------------------------------- suppliers & purchases
  await run(`CREATE TABLE IF NOT EXISTS suppliers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    phone VARCHAR(30) NULL,
    email VARCHAR(190) NULL,
    address VARCHAR(255) NULL,
    opening_due DECIMAL(12,2) NOT NULL DEFAULT 0,
    note VARCHAR(500) NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ${ENGINE}`);
  await run(`CREATE TABLE IF NOT EXISTS purchases (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    ref_no VARCHAR(40) NOT NULL UNIQUE,
    supplier_id INT UNSIGNED NOT NULL,
    purchase_date DATE NOT NULL,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
    discount DECIMAL(12,2) NOT NULL DEFAULT 0,
    total DECIMAL(12,2) NOT NULL DEFAULT 0,
    paid DECIMAL(12,2) NOT NULL DEFAULT 0,
    status ENUM('received','cancelled') NOT NULL DEFAULT 'received',
    note VARCHAR(500) NULL,
    admin_id INT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_purchases_supplier (supplier_id, purchase_date),
    CONSTRAINT fk_purchases_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT
  ) ${ENGINE}`);
  await run(`CREATE TABLE IF NOT EXISTS purchase_items (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    purchase_id INT UNSIGNED NOT NULL,
    variant_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    name VARCHAR(255) NOT NULL,
    qty INT UNSIGNED NOT NULL,
    unit_cost DECIMAL(12,2) NOT NULL,
    line_total DECIMAL(12,2) NOT NULL,
    CONSTRAINT fk_pi_purchase FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE,
    CONSTRAINT fk_pi_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT
  ) ${ENGINE}`);

  // -------------------------------------------------------------- accounts
  await run(`CREATE TABLE IF NOT EXISTS accounts (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    type ENUM('cash','bank','mobile') NOT NULL DEFAULT 'cash',
    opening_balance DECIMAL(14,2) NOT NULL DEFAULT 0,
    is_default TINYINT(1) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ${ENGINE}`);
  await run(`CREATE TABLE IF NOT EXISTS account_purposes (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    kind ENUM('income','expense') NOT NULL,
    is_system TINYINT(1) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    UNIQUE KEY uq_purpose (name, kind)
  ) ${ENGINE}`);
  await run(`CREATE TABLE IF NOT EXISTS transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    account_id INT UNSIGNED NOT NULL,
    kind ENUM('income','expense','transfer_in','transfer_out') NOT NULL,
    purpose_id INT UNSIGNED NULL,
    amount DECIMAL(14,2) NOT NULL,
    txn_date DATE NOT NULL,
    note VARCHAR(500) NULL,
    ref_type VARCHAR(30) NULL,
    ref_id BIGINT UNSIGNED NULL,
    admin_id INT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_txn_account (account_id, txn_date),
    INDEX idx_txn_date (txn_date, kind),
    INDEX idx_txn_ref (ref_type, ref_id),
    CONSTRAINT fk_txn_account FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
    CONSTRAINT fk_txn_purpose FOREIGN KEY (purpose_id) REFERENCES account_purposes(id) ON DELETE SET NULL
  ) ${ENGINE}`);
  await run(`CREATE TABLE IF NOT EXISTS fund_transfers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    from_account_id INT UNSIGNED NOT NULL,
    to_account_id INT UNSIGNED NOT NULL,
    amount DECIMAL(14,2) NOT NULL,
    transfer_date DATE NOT NULL,
    note VARCHAR(500) NULL,
    admin_id INT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_ft_from FOREIGN KEY (from_account_id) REFERENCES accounts(id) ON DELETE RESTRICT,
    CONSTRAINT fk_ft_to FOREIGN KEY (to_account_id) REFERENCES accounts(id) ON DELETE RESTRICT
  ) ${ENGINE}`);
  await run(`CREATE TABLE IF NOT EXISTS due_records (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    direction ENUM('receivable','payable') NOT NULL,
    party_name VARCHAR(160) NOT NULL,
    party_phone VARCHAR(30) NULL,
    amount DECIMAL(14,2) NOT NULL,
    paid DECIMAL(14,2) NOT NULL DEFAULT 0,
    due_date DATE NULL,
    note VARCHAR(500) NULL,
    status ENUM('open','settled') NOT NULL DEFAULT 'open',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_due_status (status, direction)
  ) ${ENGINE}`);
  await run(`CREATE TABLE IF NOT EXISTS employees (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(160) NOT NULL,
    phone VARCHAR(30) NULL,
    designation VARCHAR(120) NULL,
    monthly_salary DECIMAL(12,2) NOT NULL DEFAULT 0,
    joined_on DATE NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ${ENGINE}`);
  await run(`CREATE TABLE IF NOT EXISTS salary_payments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    employee_id INT UNSIGNED NOT NULL,
    salary_month CHAR(7) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    account_id INT UNSIGNED NOT NULL,
    paid_on DATE NOT NULL,
    note VARCHAR(255) NULL,
    admin_id INT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_salary_emp (employee_id, salary_month),
    CONSTRAINT fk_salary_emp FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE RESTRICT
  ) ${ENGINE}`);
  await run(`CREATE TABLE IF NOT EXISTS bills (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(160) NOT NULL,
    purpose_id INT UNSIGNED NULL,
    amount DECIMAL(12,2) NOT NULL,
    due_date DATE NULL,
    status ENUM('unpaid','paid') NOT NULL DEFAULT 'unpaid',
    paid_on DATE NULL,
    account_id INT UNSIGNED NULL,
    note VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_bills_status (status, due_date)
  ) ${ENGINE}`);

  // ------------------------------------------------------------- customers
  await addColumns('customers', {
    address: 'VARCHAR(255) NULL',
    city: 'VARCHAR(120) NULL',
    avatar_url: 'VARCHAR(500) NULL',
    google_id: 'VARCHAR(64) NULL',
    facebook_id: 'VARCHAR(64) NULL',
    is_blocked: 'TINYINT(1) NOT NULL DEFAULT 0',
    block_reason: 'VARCHAR(255) NULL',
    note: 'VARCHAR(500) NULL',
    last_login_at: 'DATETIME NULL',
  });
  await addIndex('customers', 'uq_customers_google', 'google_id', true);
  await addIndex('customers', 'uq_customers_facebook', 'facebook_id', true);
  await run(`CREATE TABLE IF NOT EXISTS customer_sessions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id INT UNSIGNED NOT NULL,
    token_hash CHAR(64) NOT NULL UNIQUE,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_cs_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
  ) ${ENGINE}`);
  await run(`CREATE TABLE IF NOT EXISTS blocklist (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    kind ENUM('phone','ip') NOT NULL,
    value VARCHAR(64) NOT NULL,
    reason VARCHAR(255) NULL,
    admin_id INT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_block (kind, value)
  ) ${ENGINE}`);

  // -------------------------------------------------- messages and reviews
  await run(`CREATE TABLE IF NOT EXISTS contact_messages (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    phone VARCHAR(30) NULL,
    email VARCHAR(190) NULL,
    subject VARCHAR(160) NULL,
    message VARCHAR(2000) NOT NULL,
    status ENUM('new','read','replied') NOT NULL DEFAULT 'new',
    reply_note VARCHAR(1000) NULL,
    ip_address VARCHAR(64) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_msg_status (status, id)
  ) ${ENGINE}`);
  await addColumns('reviews', {
    status: "ENUM('pending','approved','hidden') NOT NULL DEFAULT 'pending'",
    admin_reply: 'VARCHAR(1000) NULL',
  });
  await addColumns('newsletter_subscribers', {
    is_active: 'TINYINT(1) NOT NULL DEFAULT 1',
  });

  // ------------------------------------------------ roles and permissions
  await addColumns('admin_roles', {
    description: 'VARCHAR(255) NULL',
    is_system: 'TINYINT(1) NOT NULL DEFAULT 0',
  });
  await addColumns('admin_users', {
    phone: 'VARCHAR(30) NULL',
    must_change_password: 'TINYINT(1) NOT NULL DEFAULT 0',
  });
  await run(`CREATE TABLE IF NOT EXISTS role_permissions (
    role_id INT UNSIGNED NOT NULL,
    permission VARCHAR(60) NOT NULL,
    PRIMARY KEY (role_id, permission),
    CONSTRAINT fk_rp_role FOREIGN KEY (role_id) REFERENCES admin_roles(id) ON DELETE CASCADE
  ) ${ENGINE}`);
  await run(`CREATE TABLE IF NOT EXISTS activity_log (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    admin_id INT UNSIGNED NULL,
    action VARCHAR(60) NOT NULL,
    entity VARCHAR(40) NULL,
    entity_id VARCHAR(40) NULL,
    detail VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_activity_created (created_at),
    INDEX idx_activity_entity (entity, entity_id)
  ) ${ENGINE}`);

  // ---------------------------------------------------------- CMS and site
  await run(`CREATE TABLE IF NOT EXISTS site_settings (
    setting_key VARCHAR(80) PRIMARY KEY,
    setting_value MEDIUMTEXT NULL,
    is_secret TINYINT(1) NOT NULL DEFAULT 0,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ${ENGINE}`);
  await run(`CREATE TABLE IF NOT EXISTS cms_pages (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(120) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    body MEDIUMTEXT NULL,
    meta_description VARCHAR(300) NULL,
    is_published TINYINT(1) NOT NULL DEFAULT 1,
    show_in_footer TINYINT(1) NOT NULL DEFAULT 1,
    sort_order INT NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ${ENGINE}`);
  await run(`CREATE TABLE IF NOT EXISTS sliders (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(200) NULL,
    subtitle VARCHAR(300) NULL,
    image_url VARCHAR(500) NOT NULL,
    link_url VARCHAR(500) NULL,
    button_text VARCHAR(60) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    starts_at DATETIME NULL,
    ends_at DATETIME NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ${ENGINE}`);
  await run(`CREATE TABLE IF NOT EXISTS banners (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    placement VARCHAR(40) NOT NULL,
    title VARCHAR(200) NULL,
    image_url VARCHAR(500) NOT NULL,
    link_url VARCHAR(500) NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_banner_place (placement, is_active, sort_order)
  ) ${ENGINE}`);
  await run(`CREATE TABLE IF NOT EXISTS menu_links (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    location ENUM('header','footer') NOT NULL,
    group_name VARCHAR(80) NULL,
    label VARCHAR(80) NOT NULL,
    url VARCHAR(500) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1
  ) ${ENGINE}`);
  await run(`CREATE TABLE IF NOT EXISTS landing_pages (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    slug VARCHAR(120) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    headline VARCHAR(255) NULL,
    subheadline VARCHAR(400) NULL,
    hero_image VARCHAR(500) NULL,
    body MEDIUMTEXT NULL,
    button_text VARCHAR(60) NULL,
    product_ids JSON NULL,
    is_published TINYINT(1) NOT NULL DEFAULT 0,
    view_count INT UNSIGNED NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
  ) ${ENGINE}`);
  await run(`CREATE TABLE IF NOT EXISTS marketing_tags (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    placement ENUM('head','body') NOT NULL DEFAULT 'head',
    code MEDIUMTEXT NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
  ) ${ENGINE}`);
  await run(`CREATE TABLE IF NOT EXISTS capi_events (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    event_id VARCHAR(80) NOT NULL,
    event_name VARCHAR(40) NOT NULL,
    order_id INT UNSIGNED NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    attempts INT UNSIGNED NOT NULL DEFAULT 0,
    response VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_capi_event (event_id, event_name)
  ) ${ENGINE}`);

  // --------------------------------------------------- courier credentials
  await addColumns('courier_providers', {
    api_credentials_enc: 'TEXT NULL',
    api_enabled: 'TINYINT(1) NOT NULL DEFAULT 0',
    api_mode: "VARCHAR(20) NOT NULL DEFAULT 'live'",
  });
  await addColumns('courier_shipments', {
    provider_status: 'VARCHAR(100) NULL',
    last_synced_at: 'DATETIME NULL',
  });
}

module.exports = { up, ORDER_STATUSES };
