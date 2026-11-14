-- Aayash E-Mart: food e-commerce schema (MySQL 8 / MariaDB 10.5+, InnoDB, utf8mb4)

CREATE TABLE IF NOT EXISTS categories (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  parent_id   INT UNSIGNED NULL,
  name        VARCHAR(120) NOT NULL,
  slug        VARCHAR(140) NOT NULL UNIQUE,
  emoji       VARCHAR(16) NULL,
  image_url   VARCHAR(500) NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS brands (
  id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name  VARCHAR(120) NOT NULL UNIQUE,
  slug  VARCHAR(140) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS products (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id  INT UNSIGNED NOT NULL,
  brand_id     INT UNSIGNED NULL,
  name         VARCHAR(200) NOT NULL,
  slug         VARCHAR(220) NOT NULL UNIQUE,
  short_desc   VARCHAR(300) NULL,
  description  TEXT NULL,
  image_url    VARCHAR(500) NULL,           -- main image; UI falls back to the emoji
  emoji        VARCHAR(16) NULL,
  origin       VARCHAR(120) NULL,
  storage      VARCHAR(200) NULL,
  shelf_life   VARCHAR(80) NULL,
  ingredients  TEXT NULL,
  nutrition    JSON NULL,                   -- per 100 g: {"calories":..,"protein":..,"carbs":..,"fat":..}
  is_featured  TINYINT(1) NOT NULL DEFAULT 0,
  is_active    TINYINT(1) NOT NULL DEFAULT 1,
  sold_count   INT UNSIGNED NOT NULL DEFAULT 0,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_products_category (category_id),
  INDEX idx_products_sold (sold_count),
  CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id),
  CONSTRAINT fk_products_brand FOREIGN KEY (brand_id) REFERENCES brands(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Pack sizes / weights (the "color variants" of grocery): 500 g, 1 kg, 12 pcs ...
CREATE TABLE IF NOT EXISTS product_variants (
  id                INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id        INT UNSIGNED NOT NULL,
  sku               VARCHAR(60) NOT NULL UNIQUE,
  label             VARCHAR(60) NOT NULL,
  price             DECIMAL(10,2) NOT NULL,
  compare_at_price  DECIMAL(10,2) NULL,      -- set to show a discount
  stock             INT NOT NULL DEFAULT 0,
  is_default        TINYINT(1) NOT NULL DEFAULT 0,
  INDEX idx_variants_product (product_id),
  CONSTRAINT fk_variants_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS product_images (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id  INT UNSIGNED NOT NULL,
  url         VARCHAR(500) NOT NULL,
  alt         VARCHAR(200) NULL,
  sort_order  INT NOT NULL DEFAULT 0,
  CONSTRAINT fk_images_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS customers (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name           VARCHAR(120) NOT NULL,
  phone          VARCHAR(30) NOT NULL UNIQUE,
  email          VARCHAR(190) NULL UNIQUE,
  password_hash  VARCHAR(255) NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS addresses (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  customer_id  INT UNSIGNED NOT NULL,
  label        VARCHAR(40) NOT NULL DEFAULT 'Home',
  line1        VARCHAR(255) NOT NULL,
  area         VARCHAR(120) NULL,
  city         VARCHAR(120) NOT NULL DEFAULT 'Dhaka',
  postal_code  VARCHAR(20) NULL,
  phone        VARCHAR(30) NULL,
  is_default   TINYINT(1) NOT NULL DEFAULT 0,
  CONSTRAINT fk_addresses_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS coupons (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code            VARCHAR(40) NOT NULL UNIQUE,
  discount_type   ENUM('percent','fixed') NOT NULL,
  discount_value  DECIMAL(10,2) NOT NULL,
  min_order       DECIMAL(10,2) NOT NULL DEFAULT 0,
  expires_at      DATETIME NULL,
  is_active       TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS orders (
  id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_no        VARCHAR(30) NOT NULL UNIQUE,
  customer_id     INT UNSIGNED NULL,
  guest_name      VARCHAR(120) NOT NULL,
  guest_phone     VARCHAR(30) NOT NULL,
  address_line    VARCHAR(255) NOT NULL,
  area            VARCHAR(120) NULL,
  city            VARCHAR(120) NOT NULL DEFAULT 'Dhaka',
  note            VARCHAR(500) NULL,
  payment_method  VARCHAR(20) NOT NULL DEFAULT 'cod',
  payment_status  VARCHAR(20) NOT NULL DEFAULT 'pending',
  status          ENUM('placed','confirmed','packed','out_for_delivery','delivered','cancelled') NOT NULL DEFAULT 'placed',
  subtotal        DECIMAL(10,2) NOT NULL,
  delivery_fee    DECIMAL(10,2) NOT NULL DEFAULT 0,
  discount        DECIMAL(10,2) NOT NULL DEFAULT 0,
  total           DECIMAL(10,2) NOT NULL,
  coupon_id       INT UNSIGNED NULL,
  created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_orders_phone (guest_phone),
  INDEX idx_orders_status (status),
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL,
  CONSTRAINT fk_orders_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS order_items (
  id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  order_id       INT UNSIGNED NOT NULL,
  product_id     INT UNSIGNED NOT NULL,
  variant_id     INT UNSIGNED NOT NULL,
  name           VARCHAR(200) NOT NULL,      -- snapshot at purchase time
  variant_label  VARCHAR(60) NOT NULL,
  unit_price     DECIMAL(10,2) NOT NULL,
  qty            INT UNSIGNED NOT NULL,
  line_total     DECIMAL(10,2) NOT NULL,
  CONSTRAINT fk_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_items_product FOREIGN KEY (product_id) REFERENCES products(id),
  CONSTRAINT fk_items_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS reviews (
  id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  product_id   INT UNSIGNED NOT NULL,
  customer_id  INT UNSIGNED NULL,
  author       VARCHAR(120) NOT NULL,
  rating       TINYINT UNSIGNED NOT NULL,
  body         VARCHAR(1000) NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_reviews_product (product_id),
  CONSTRAINT chk_reviews_rating CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT fk_reviews_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  CONSTRAINT fk_reviews_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS wishlists (
  customer_id  INT UNSIGNED NOT NULL,
  product_id   INT UNSIGNED NOT NULL,
  PRIMARY KEY (customer_id, product_id),
  CONSTRAINT fk_wishlists_customer FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE,
  CONSTRAINT fk_wishlists_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email       VARCHAR(190) NOT NULL UNIQUE,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
