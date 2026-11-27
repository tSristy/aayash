'use strict';

const express = require('express');
const { pool } = require('../../../db');
const { HttpError, route, intParam, text } = require('../../lib/http');
const { publicRateLimit } = require('../../middleware/public-rate-limit');
const { publicSettings } = require('../../services/settings');
const { resolveShipping, setting } = require('../../services/orders/order-service');
const { normalizePhone } = require('../../services/orders/order-policy');

const router = express.Router();

router.get('/site', route(async (_req, res) => {
  const [settings, [menus], [pages], [sliders], [banners], [tags]] = await Promise.all([
    publicSettings(),
    pool.query('SELECT location, group_name, label, url, sort_order FROM menu_links WHERE is_active = 1 ORDER BY sort_order, id'),
    pool.query('SELECT slug, title FROM cms_pages WHERE is_published = 1 AND show_in_footer = 1 ORDER BY sort_order, id'),
    pool.query('SELECT id, title, subtitle, image_url, link_url, button_text FROM sliders WHERE is_active = 1 AND (starts_at IS NULL OR starts_at <= NOW()) AND (ends_at IS NULL OR ends_at >= NOW()) ORDER BY sort_order, id'),
    pool.query('SELECT id, placement, title, image_url, link_url FROM banners WHERE is_active = 1 ORDER BY sort_order, id'),
    pool.query('SELECT id, placement, code FROM marketing_tags WHERE is_active = 1 ORDER BY id'),
  ]);
  res.set('Cache-Control', 'no-store');
  res.json({
    settings,
    menus: { header: menus.filter((m) => m.location === 'header'), footer: menus.filter((m) => m.location === 'footer') },
    footerPages: pages, sliders,
    banners: banners.reduce((acc, b) => { (acc[b.placement] ||= []).push(b); return acc; }, {}),
    tags: { head: tags.filter((t) => t.placement === 'head').map((t) => t.code), body: tags.filter((t) => t.placement === 'body').map((t) => t.code) },
  });
}));

router.get('/pages/:slug', route(async (req, res) => {
  const [[page]] = await pool.query('SELECT slug, title, body, meta_description, updated_at FROM cms_pages WHERE slug = ? AND is_published = 1', [String(req.params.slug).slice(0, 120)]);
  if (!page) throw new HttpError(404, 'Page not found.');
  res.json(page);
}));

const lines = (t) => String(t || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => l.split('|').map((x) => x.trim()));

router.get('/landing/:slug', route(async (req, res) => {
  const [[page]] = await pool.query('SELECT * FROM landing_pages WHERE slug = ? AND is_published = 1', [String(req.params.slug).slice(0, 120)]);
  if (!page) throw new HttpError(404, 'Page not found.');
  const ids = (typeof page.product_ids === 'string' ? JSON.parse(page.product_ids) : page.product_ids) || [];
  let products = [];
  if (ids.length) {
    const [rows] = await pool.query(`
      SELECT p.id AS product_id, p.name, p.slug, p.is_combo, p.gift_mode, COALESCE(NULLIF(p.image_url, ''), (SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order, pi.id LIMIT 1)) AS image_url,
             v.id AS variant_id, v.label, v.price, v.compare_at_price, v.stock
      FROM products p JOIN product_variants v ON v.product_id = p.id AND v.is_default = 1
      WHERE p.id IN (${ids.map(() => '?').join(',')}) AND p.status = 'active' AND p.is_active = 1`, ids.map(Number));
    products = ids.map((id) => rows.find((r) => r.product_id === Number(id))).filter(Boolean).map((r) => ({ ...r, price: Number(r.price), compare_at_price: r.compare_at_price == null ? null : Number(r.compare_at_price) }));
    // Free gifts shown in the offer: a combo's own gifts, or gifts of an "also with main" combo this product leads.
    for (const p of products) {
      const [gifts] = await pool.query(p.is_combo ? `
        SELECT gp.name, gi.qty, COALESCE(NULLIF(gp.image_url, ''), (SELECT pi.url FROM product_images pi WHERE pi.product_id = gp.id ORDER BY pi.sort_order, pi.id LIMIT 1)) AS image_url
        FROM combo_items gi JOIN product_variants gv ON gv.id = gi.variant_id JOIN products gp ON gp.id = gv.product_id
        WHERE gi.combo_product_id = ? AND gi.role = 'gift' ORDER BY gi.id` : `
        SELECT gp.name, gi.qty, COALESCE(NULLIF(gp.image_url, ''), (SELECT pi.url FROM product_images pi WHERE pi.product_id = gp.id ORDER BY pi.sort_order, pi.id LIMIT 1)) AS image_url
        FROM combo_items mi
        JOIN products cp ON cp.id = mi.combo_product_id AND cp.is_combo = 1 AND cp.is_active = 1 AND cp.status = 'active' AND cp.gift_mode = 'with_main'
        JOIN combo_items gi ON gi.combo_product_id = cp.id AND gi.role = 'gift'
        JOIN product_variants gv ON gv.id = gi.variant_id JOIN products gp ON gp.id = gv.product_id
        WHERE mi.role = 'main' AND mi.variant_id = ? ORDER BY gi.id`, [p.is_combo ? p.product_id : p.variant_id]);
      p.gifts = gifts;
    }
  }
  await pool.query('UPDATE landing_pages SET view_count = view_count + 1 WHERE id = ?', [page.id]);
  let gallery = []; try { gallery = JSON.parse(page.gallery || '[]'); } catch { /* ignore */ }
  res.json({
    id: page.id, slug: page.slug, title: page.title, headline: page.headline, subheadline: page.subheadline, hero_image: page.hero_image, body: page.body, button_text: page.button_text,
    badge: page.badge, offer_note: page.offer_note, offer_ends_at: page.offer_ends_at,
    benefits: lines(page.benefits).slice(0, 6).map(([title, text]) => ({ title, text: text || '' })),
    reviews: lines(page.reviews).slice(0, 12).map(([name, rating, text]) => ({ name, rating: Math.min(5, Math.max(1, Number(rating) || 5)), text: text || '' })),
    faq: lines(page.faq).slice(0, 12).map(([q, a]) => ({ q, a: a || '' })),
    gallery: Array.isArray(gallery) ? gallery.slice(0, 6) : [],
    products,
  });
}));

// Delivery locations are database driven so staff can change charges without a deploy.
router.get('/locations', route(async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT c.id, c.name, z.name AS zone, COALESCE(c.charge_override, z.charge) AS charge,
           (SELECT COUNT(*) FROM delivery_areas a WHERE a.city_id = c.id AND a.is_active = 1) AS area_count
    FROM delivery_cities c JOIN delivery_zones z ON z.id = c.zone_id WHERE c.is_active = 1 AND z.is_active = 1 ORDER BY c.name`);
  res.json({ cities: rows.map((r) => ({ ...r, charge: Number(r.charge), area_count: Number(r.area_count) })) });
}));
router.get('/locations/:cityId/areas', route(async (req, res) => {
  const [rows] = await pool.query('SELECT id, name, charge_override FROM delivery_areas WHERE city_id = ? AND is_active = 1 ORDER BY name', [intParam(req.params.cityId)]);
  res.json({ areas: rows.map((r) => ({ ...r, charge_override: r.charge_override == null ? null : Number(r.charge_override) })) });
}));

router.post('/delivery-quote', publicRateLimit({ max: 60 }), route(async (req, res) => {
  const shipping = await resolveShipping(pool, req.body?.city, req.body?.areaId ? Number(req.body.areaId) : null);
  const variantIds = (Array.isArray(req.body?.items) ? req.body.items : []).map((i) => Number(i.variantId)).filter((n) => Number.isSafeInteger(n) && n > 0).slice(0, 60);
  let free = false;
  let reason = null;
  if (variantIds.length) {
    const [[flag]] = await pool.query(`SELECT COUNT(*) AS n FROM product_variants v JOIN products p ON p.id = v.product_id WHERE v.id IN (${variantIds.map(() => '?').join(',')}) AND p.is_free_delivery = 1`, variantIds);
    if (Number(flag.n) > 0) { free = true; reason = 'Free delivery on a product in your cart'; }
  }
  const minOrder = Number(await setting(pool, 'free_delivery_min_order'));
  const subtotal = Number(req.body?.subtotal) || 0;
  if (!free && minOrder > 0 && subtotal >= minOrder) { free = true; reason = `Free delivery on orders over ৳${minOrder}`; }
  res.json({ charge: free ? 0 : shipping.charge, standardCharge: shipping.charge, free, reason, freeOver: minOrder > 0 ? minOrder : null });
}));

router.post('/contact', publicRateLimit({ max: 5 }), route(async (req, res) => {
  const b = req.body || {};
  const name = text(b.name, 'Name', { max: 120, required: true });
  const message = text(b.message, 'Message', { max: 2000, required: true });
  const phone = b.phone ? normalizePhone(b.phone) : null;
  const email = text(b.email, 'Email', { max: 190 });
  if (!phone && !email) throw new HttpError(400, 'Give a phone number or an email so we can reply.');
  if (b.phone && !phone) throw new HttpError(400, 'Enter a valid Bangladesh mobile number.');
  if (email && !/^\S+@\S+\.\S+$/.test(email)) throw new HttpError(400, 'Enter a valid email address.');
  await pool.query('INSERT INTO contact_messages (name, phone, email, subject, message, ip_address) VALUES (?,?,?,?,?,?)', [name, phone, email, text(b.subject, 'Subject', { max: 160 }), message, req.ip]);
  res.status(201).json({ ok: true });
}));

router.post('/reviews', publicRateLimit({ max: 5 }), route(async (req, res) => {
  const b = req.body || {};
  const rating = Number(b.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) throw new HttpError(400, 'Choose a rating from 1 to 5.');
  const [[product]] = await pool.query("SELECT id FROM products WHERE slug = ? AND status = 'active'", [String(b.productSlug || '')]);
  if (!product) throw new HttpError(404, 'Product not found.');
  await pool.query("INSERT INTO reviews (product_id, author, rating, body, status) VALUES (?,?,?,?, 'pending')",
    [product.id, text(b.author, 'Name', { max: 120, required: true }), rating, text(b.body, 'Review', { max: 1000 })]);
  res.status(201).json({ ok: true, message: 'Thanks! Your review will appear after we approve it.' });
}));

router.post('/products/:slug/view', publicRateLimit({ max: 90 }), route(async (req, res) => {
  const [[p]] = await pool.query("SELECT id FROM products WHERE slug = ? AND status = 'active'", [String(req.params.slug).slice(0, 220)]);
  if (p) {
    await pool.query('UPDATE products SET view_count = view_count + 1 WHERE id = ?', [p.id]);
    await pool.query('INSERT INTO product_views_daily (product_id, view_date, views) VALUES (?, CURDATE(), 1) ON DUPLICATE KEY UPDATE views = views + 1', [p.id]);
  }
  res.json({ ok: true });
}));

module.exports = router;
