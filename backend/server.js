const express = require('express');
const cors = require('cors');
const db = require('./db');
const { PORT, CORS_ORIGIN, FREE_DELIVERY_OVER, DELIVERY_FEE } = require('./config');

if (db.prepare('SELECT COUNT(*) n FROM categories').get().n === 0) {
  require('./seed').seed(db);
  console.log('Empty database detected - seeded sample data.');
}

const app = express();
app.use(cors({ origin: CORS_ORIGIN.split(',') }));
app.use(express.json());

const LIST_SQL = `
  SELECT p.id, p.name, p.slug, p.short_desc, p.emoji, p.image_url, p.sold_count,
         c.name AS category_name, c.slug AS category_slug,
         v.id AS variant_id, v.label AS variant_label, v.price, v.compare_at_price, v.stock,
         (SELECT ROUND(AVG(rating), 1) FROM reviews r WHERE r.product_id = p.id) AS rating,
         (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id) AS review_count
  FROM products p
  JOIN categories c ON c.id = p.category_id
  JOIN product_variants v ON v.product_id = p.id AND v.is_default = 1`;

app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.get('/api/categories', (_req, res) => {
  res.json(db.prepare(`
    SELECT c.id, c.name, c.slug, c.emoji, c.image_url,
           (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id AND p.is_active = 1) AS product_count
    FROM categories c WHERE c.is_active = 1 ORDER BY c.sort_order`).all());
});

app.get('/api/products', (req, res) => {
  const { category, q, sort = 'popular', deal, limit = 48 } = req.query;
  const where = ['p.is_active = 1'];
  const args = [];
  if (category) { where.push('c.slug = ?'); args.push(category); }
  if (q) { where.push('(p.name LIKE ? OR p.short_desc LIKE ?)'); args.push(`%${q}%`, `%${q}%`); }
  if (deal) where.push('v.compare_at_price IS NOT NULL');
  const order = {
    popular: 'p.sold_count DESC', price_asc: 'v.price ASC', price_desc: 'v.price DESC', newest: 'p.id DESC',
  }[sort] || 'p.sold_count DESC';
  res.json(db.prepare(`${LIST_SQL} WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT ?`)
    .all(...args, Math.min(parseInt(limit, 10) || 48, 100)));
});

app.get('/api/products/:slug', (req, res) => {
  const p = db.prepare(`
    SELECT p.*, c.name AS category_name, c.slug AS category_slug, b.name AS brand_name
    FROM products p JOIN categories c ON c.id = p.category_id LEFT JOIN brands b ON b.id = p.brand_id
    WHERE p.slug = ? AND p.is_active = 1`).get(req.params.slug);
  if (!p) return res.status(404).json({ error: 'Product not found' });

  p.variants = db.prepare('SELECT id, sku, label, price, compare_at_price, stock, is_default FROM product_variants WHERE product_id = ? ORDER BY id').all(p.id);
  p.images = db.prepare('SELECT url, alt FROM product_images WHERE product_id = ? ORDER BY sort_order').all(p.id);
  p.reviews = db.prepare('SELECT author, rating, body, created_at FROM reviews WHERE product_id = ? ORDER BY id DESC LIMIT 20').all(p.id);
  const agg = db.prepare('SELECT ROUND(AVG(rating),1) AS rating, COUNT(*) AS n FROM reviews WHERE product_id = ?').get(p.id);
  p.rating = agg.rating; p.review_count = agg.n;
  p.nutrition = p.nutrition_json ? JSON.parse(p.nutrition_json) : null;
  delete p.nutrition_json;
  p.related = db.prepare(`${LIST_SQL} WHERE p.category_id = ? AND p.id <> ? AND p.is_active = 1 ORDER BY p.sold_count DESC LIMIT 4`).all(p.category_id, p.id);
  res.json(p);
});

app.post('/api/newsletter', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return res.status(400).json({ error: 'Enter a valid email address.' });
  db.prepare('INSERT OR IGNORE INTO newsletter_subscribers (email) VALUES (?)').run(email);
  res.status(201).json({ ok: true });
});

// Prices are always recalculated from the database - the client only sends variant ids and quantities.
app.post('/api/orders', (req, res) => {
  const { customer = {}, address = {}, items, paymentMethod = 'cod', couponCode, note } = req.body || {};
  if (!customer.name?.trim() || !customer.phone?.trim()) return res.status(400).json({ error: 'Name and phone are required.' });
  if (!address.line1?.trim()) return res.status(400).json({ error: 'Delivery address is required.' });
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Your cart is empty.' });

  try {
    const result = db.transaction(() => {
      const lines = items.map(({ variantId, qty }) => {
        const q = parseInt(qty, 10);
        const row = db.prepare(`SELECT v.id, v.label, v.price, v.stock, p.id AS product_id, p.name
          FROM product_variants v JOIN products p ON p.id = v.product_id WHERE v.id = ? AND p.is_active = 1`).get(variantId);
        if (!row || !(q > 0)) throw Object.assign(new Error('An item in your cart is no longer available.'), { status: 400 });
        if (row.stock < q) throw Object.assign(new Error(`Only ${row.stock} left of ${row.name} (${row.label}).`), { status: 409 });
        return { ...row, qty: q, line_total: row.price * q };
      });

      const subtotal = lines.reduce((n, l) => n + l.line_total, 0);
      let discount = 0, coupon = null;
      if (couponCode) {
        coupon = db.prepare(`SELECT * FROM coupons WHERE code = ? COLLATE NOCASE AND is_active = 1
          AND (expires_at IS NULL OR expires_at > datetime('now'))`).get(couponCode.trim());
        if (!coupon) throw Object.assign(new Error('That coupon code is not valid.'), { status: 400 });
        if (subtotal < coupon.min_order) throw Object.assign(new Error(`Add ৳${coupon.min_order - subtotal} more to use ${coupon.code}.`), { status: 400 });
        discount = coupon.discount_type === 'percent' ? Math.round(subtotal * coupon.value / 100) : Math.min(coupon.value, subtotal);
      }
      const deliveryFee = subtotal >= FREE_DELIVERY_OVER ? 0 : DELIVERY_FEE;
      const total = subtotal - discount + deliveryFee;
      const orderNo = 'AEM-' + Date.now().toString(36).toUpperCase();

      const orderId = db.prepare(`INSERT INTO orders
        (order_no, guest_name, guest_phone, address_line, area, city, note, payment_method, subtotal, delivery_fee, discount, total, coupon_id)
        VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`).run(orderNo, customer.name.trim(), customer.phone.trim(), address.line1.trim(),
        address.area || null, address.city || 'Dhaka', note || null, paymentMethod, subtotal, deliveryFee, discount, total, coupon?.id || null).lastInsertRowid;

      const insItem = db.prepare('INSERT INTO order_items (order_id, product_id, variant_id, name, variant_label, unit_price, qty, line_total) VALUES (?,?,?,?,?,?,?,?)');
      for (const l of lines) {
        insItem.run(orderId, l.product_id, l.id, l.name, l.label, l.price, l.qty, l.line_total);
        db.prepare('UPDATE product_variants SET stock = stock - ? WHERE id = ?').run(l.qty, l.id);
        db.prepare('UPDATE products SET sold_count = sold_count + ? WHERE id = ?').run(l.qty, l.product_id);
      }
      return { orderNo, subtotal, discount, deliveryFee, total };
    })();
    res.status(201).json(result);
  } catch (e) {
    res.status(e.status || 500).json({ error: e.status ? e.message : 'Could not place the order.' });
  }
});

app.listen(PORT, () => console.log(`Aayash E-Mart API running on http://localhost:${PORT}`));
