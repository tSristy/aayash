const express = require('express');
const cors = require('cors');
const { pool, init } = require('./db');
const { seed } = require('./seed');
const { PORT, CORS_ORIGIN, FREE_DELIVERY_OVER, DELIVERY_FEE } = require('./config');

const app = express();
app.use(cors({ origin: CORS_ORIGIN.split(',') }));
app.use(express.json());

const query = async (sql, params) => (await pool.query(sql, params))[0];
const one = async (sql, params) => (await query(sql, params))[0];

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
// Wraps async handlers so thrown errors become JSON responses.
const route = (fn) => (req, res) => fn(req, res).catch((e) => {
  if (e instanceof HttpError) return res.status(e.status).json({ error: e.message });
  console.error(e);
  res.status(500).json({ error: 'Something went wrong.' });
});

const LIST_SQL = `
  SELECT p.id, p.name, p.slug, p.short_desc, p.emoji, p.image_url, p.sold_count,
         c.name AS category_name, c.slug AS category_slug,
         v.id AS variant_id, v.label AS variant_label, v.price, v.compare_at_price, v.stock,
         (SELECT ROUND(AVG(rating), 1) FROM reviews r WHERE r.product_id = p.id) AS rating,
         (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id) AS review_count
  FROM products p
  JOIN categories c ON c.id = p.category_id
  JOIN product_variants v ON v.product_id = p.id AND v.is_default = 1`;

app.get('/api/health', route(async (_req, res) => {
  await query('SELECT 1');
  res.json({ ok: true });
}));

app.get('/api/categories', route(async (_req, res) => {
  res.json(await query(`
    SELECT c.id, c.name, c.slug, c.emoji, c.image_url,
           (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) AS product_count
    FROM categories c WHERE c.is_active = 1 ORDER BY c.sort_order`));
}));

app.get('/api/products', route(async (req, res) => {
  const { category, q, sort = 'popular', deal, limit = 48 } = req.query;
  const where = ['p.is_active = 1'];
  const args = [];
  if (category) { where.push('c.slug = ?'); args.push(category); }
  if (q) { where.push('(p.name LIKE ? OR p.short_desc LIKE ?)'); args.push(`%${q}%`, `%${q}%`); }
  if (deal) where.push('v.compare_at_price IS NOT NULL');
  const order = {
    popular: 'p.sold_count DESC', price_asc: 'v.price ASC', price_desc: 'v.price DESC', newest: 'p.id DESC',
  }[sort] || 'p.sold_count DESC';
  res.json(await query(`${LIST_SQL} WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT ?`,
    [...args, Math.min(parseInt(limit, 10) || 48, 100)]));
}));

app.get('/api/products/:slug', route(async (req, res) => {
  const p = await one(`
    SELECT p.*, c.name AS category_name, c.slug AS category_slug, b.name AS brand_name
    FROM products p JOIN categories c ON c.id = p.category_id LEFT JOIN brands b ON b.id = p.brand_id
    WHERE p.slug = ? AND p.is_active = 1`, [req.params.slug]);
  if (!p) throw new HttpError(404, 'Product not found');

  p.variants = await query('SELECT id, sku, label, price, compare_at_price, stock, is_default FROM product_variants WHERE product_id = ? ORDER BY id', [p.id]);
  p.images = await query('SELECT url, alt FROM product_images WHERE product_id = ? ORDER BY sort_order', [p.id]);
  p.reviews = await query('SELECT author, rating, body, created_at FROM reviews WHERE product_id = ? ORDER BY id DESC LIMIT 20', [p.id]);
  const agg = await one('SELECT ROUND(AVG(rating), 1) AS rating, COUNT(*) AS n FROM reviews WHERE product_id = ?', [p.id]);
  p.rating = agg.rating; p.review_count = agg.n;
  // mysql2 parses JSON columns on MySQL; MariaDB stores JSON as text, so handle both.
  if (typeof p.nutrition === 'string') p.nutrition = JSON.parse(p.nutrition);
  p.related = await query(`${LIST_SQL} WHERE p.category_id = ? AND p.id <> ? AND p.is_active = 1 ORDER BY p.sold_count DESC LIMIT 4`, [p.category_id, p.id]);
  res.json(p);
}));

app.post('/api/newsletter', route(async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, 'Enter a valid email address.');
  await query('INSERT IGNORE INTO newsletter_subscribers (email) VALUES (?)', [email]);
  res.status(201).json({ ok: true });
}));

// Prices are always recalculated from the database - the client only sends variant ids and quantities.
app.post('/api/orders', route(async (req, res) => {
  const { customer = {}, address = {}, items, paymentMethod = 'cod', couponCode, note } = req.body || {};
  if (!customer.name?.trim() || !customer.phone?.trim()) throw new HttpError(400, 'Name and phone are required.');
  if (!address.line1?.trim()) throw new HttpError(400, 'Delivery address is required.');
  if (!Array.isArray(items) || !items.length) throw new HttpError(400, 'Your cart is empty.');

  // Merge duplicate variants and sort by id so concurrent orders lock rows in the same order (avoids deadlocks).
  const wanted = new Map();
  for (const { variantId, qty } of items) {
    const id = parseInt(variantId, 10), q = parseInt(qty, 10);
    if (!(id > 0) || !(q > 0)) throw new HttpError(400, 'An item in your cart is invalid.');
    wanted.set(id, (wanted.get(id) || 0) + q);
  }
  const ids = [...wanted.keys()].sort((a, b) => a - b);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const lines = [];
    for (const id of ids) {
      const [[row]] = await conn.query(
        `SELECT v.id, v.label, v.price, v.stock, p.id AS product_id, p.name
         FROM product_variants v JOIN products p ON p.id = v.product_id
         WHERE v.id = ? AND p.is_active = 1 FOR UPDATE`, [id]);
      const qty = wanted.get(id);
      if (!row) throw new HttpError(400, 'An item in your cart is no longer available.');
      if (row.stock < qty) throw new HttpError(409, `Only ${row.stock} left of ${row.name} (${row.label}).`);
      lines.push({ ...row, qty, line_total: row.price * qty });
    }

    const subtotal = lines.reduce((n, l) => n + l.line_total, 0);
    let discount = 0, coupon = null;
    if (couponCode) {
      [[coupon]] = await conn.query(
        'SELECT * FROM coupons WHERE code = ? AND is_active = 1 AND (expires_at IS NULL OR expires_at > NOW())', [couponCode.trim()]);
      if (!coupon) throw new HttpError(400, 'That coupon code is not valid.');
      if (subtotal < coupon.min_order) throw new HttpError(400, `Add ৳${coupon.min_order - subtotal} more to use ${coupon.code}.`);
      discount = coupon.discount_type === 'percent'
        ? Math.round(subtotal * coupon.discount_value / 100)
        : Math.min(coupon.discount_value, subtotal);
    }
    const deliveryFee = subtotal >= FREE_DELIVERY_OVER ? 0 : DELIVERY_FEE;
    const total = subtotal - discount + deliveryFee;
    const orderNo = 'AEM-' + Date.now().toString(36).toUpperCase();

    const [o] = await conn.query(
      `INSERT INTO orders (order_no, guest_name, guest_phone, address_line, area, city, note, payment_method, subtotal, delivery_fee, discount, total, coupon_id)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [orderNo, customer.name.trim(), customer.phone.trim(), address.line1.trim(), address.area || null, address.city || 'Dhaka',
        note || null, paymentMethod, subtotal, deliveryFee, discount, total, coupon?.id || null]);

    for (const l of lines) {
      await conn.query(
        'INSERT INTO order_items (order_id, product_id, variant_id, name, variant_label, unit_price, qty, line_total) VALUES (?,?,?,?,?,?,?,?)',
        [o.insertId, l.product_id, l.id, l.name, l.label, l.price, l.qty, l.line_total]);
      await conn.query('UPDATE product_variants SET stock = stock - ? WHERE id = ?', [l.qty, l.id]);
      await conn.query('UPDATE products SET sold_count = sold_count + ? WHERE id = ?', [l.qty, l.product_id]);
    }

    await conn.commit();
    res.status(201).json({ orderNo, subtotal, discount, deliveryFee, total });
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}));

(async () => {
  try {
    await init();
    const { n } = await one('SELECT COUNT(*) AS n FROM categories');
    if (n === 0) { await seed(pool); console.log('Empty database detected - seeded sample data.'); }
    app.listen(PORT, () => console.log(`Aayash E-Mart API running on http://localhost:${PORT}`));
  } catch (e) {
    console.error(`Could not connect to MySQL (${e.code || e.message}). Check DB_* settings in backend/.env`);
    process.exit(1);
  }
})();
