-- Aayash E-Mart: food e-commerce schema (SQLite; portable to PostgreSQL/MySQL with minor type changes)

CREATE TABLE IF NOT EXISTS categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  parent_id   INTEGER REFERENCES categories(id),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  emoji       TEXT,
  image_url   TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_active   INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS brands (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT NOT NULL UNIQUE,
  slug  TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS products (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id    INTEGER NOT NULL REFERENCES categories(id),
  brand_id       INTEGER REFERENCES brands(id),
  name           TEXT NOT NULL,
  slug           TEXT NOT NULL UNIQUE,
  short_desc     TEXT,
  description    TEXT,
  image_url      TEXT,                -- main image; falls back to emoji in the UI
  emoji          TEXT,
  origin         TEXT,
  storage        TEXT,
  shelf_life     TEXT,
  ingredients    TEXT,
  nutrition_json TEXT,                -- per 100 g: {"calories":..,"protein":..,"carbs":..,"fat":..}
  is_featured    INTEGER NOT NULL DEFAULT 0,
  is_active      INTEGER NOT NULL DEFAULT 1,
  sold_count     INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);

-- Pack sizes / weights (the "color variants" of grocery): 500 g, 1 kg, 12 pcs ...
CREATE TABLE IF NOT EXISTS product_variants (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id       INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku              TEXT NOT NULL UNIQUE,
  label            TEXT NOT NULL,
  price            REAL NOT NULL,
  compare_at_price REAL,               -- set to show a discount
  stock            INTEGER NOT NULL DEFAULT 0,
  is_default       INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_variants_product ON product_variants(product_id);

CREATE TABLE IF NOT EXISTS product_images (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id  INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url         TEXT NOT NULL,
  alt         TEXT,
  sort_order  INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS customers (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT NOT NULL,
  phone          TEXT NOT NULL UNIQUE,
  email          TEXT UNIQUE,
  password_hash  TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS addresses (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id  INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label        TEXT DEFAULT 'Home',
  line1        TEXT NOT NULL,
  area         TEXT,
  city         TEXT NOT NULL DEFAULT 'Dhaka',
  postal_code  TEXT,
  phone        TEXT,
  is_default   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS coupons (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  code           TEXT NOT NULL UNIQUE,
  discount_type  TEXT NOT NULL CHECK (discount_type IN ('percent','fixed')),
  value          REAL NOT NULL,
  min_order      REAL NOT NULL DEFAULT 0,
  expires_at     TEXT,
  is_active      INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS orders (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  order_no        TEXT NOT NULL UNIQUE,
  customer_id     INTEGER REFERENCES customers(id),
  guest_name      TEXT NOT NULL,
  guest_phone     TEXT NOT NULL,
  address_line    TEXT NOT NULL,
  area            TEXT,
  city            TEXT NOT NULL DEFAULT 'Dhaka',
  note            TEXT,
  payment_method  TEXT NOT NULL DEFAULT 'cod',
  payment_status  TEXT NOT NULL DEFAULT 'pending',
  status          TEXT NOT NULL DEFAULT 'placed'
                  CHECK (status IN ('placed','confirmed','packed','out_for_delivery','delivered','cancelled')),
  subtotal        REAL NOT NULL,
  delivery_fee    REAL NOT NULL DEFAULT 0,
  discount        REAL NOT NULL DEFAULT 0,
  total           REAL NOT NULL,
  coupon_id       INTEGER REFERENCES coupons(id),
  created_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id       INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id     INTEGER NOT NULL REFERENCES products(id),
  variant_id     INTEGER NOT NULL REFERENCES product_variants(id),
  name           TEXT NOT NULL,       -- snapshot at purchase time
  variant_label  TEXT NOT NULL,
  unit_price     REAL NOT NULL,
  qty            INTEGER NOT NULL,
  line_total     REAL NOT NULL
);

CREATE TABLE IF NOT EXISTS reviews (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  product_id   INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  customer_id  INTEGER REFERENCES customers(id),
  author       TEXT NOT NULL,
  rating       INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  body         TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS wishlists (
  customer_id  INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id   INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  PRIMARY KEY (customer_id, product_id)
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email       TEXT NOT NULL UNIQUE,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
