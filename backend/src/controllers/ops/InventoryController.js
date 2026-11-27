'use strict';

const { pool } = require('../../../db');
const { HttpError, route, withTx, intParam, money, text, paging, pageResult, likeEscape, dateOnly, audit } = require('../../lib/http');
const { adjust, syncCombo } = require('../../services/inventory/stock');

const IMAGE_SQL = `COALESCE(NULLIF(p.image_url, ''), (SELECT pi.url FROM product_images pi WHERE pi.product_id = p.id ORDER BY pi.sort_order, pi.id LIMIT 1))`;

const listProducts = route(async (req, res) => {
  const list = paging(req.query, { defaultLimit: 20 });
  const where = [];
  const params = [];
  if (req.query.q) {
    const like = `%${likeEscape(String(req.query.q).slice(0, 100))}%`;
    where.push('(p.name LIKE ? OR p.slug LIKE ? OR EXISTS (SELECT 1 FROM product_variants s WHERE s.product_id = p.id AND (s.sku LIKE ? OR s.barcode LIKE ?)))');
    params.push(like, like, like, like);
  }
  if (req.query.category_id) { where.push('p.category_id = ?'); params.push(intParam(req.query.category_id)); }
  if (['draft', 'active', 'archived'].includes(req.query.status)) { where.push('p.status = ?'); params.push(req.query.status); }
  if (req.query.free_delivery === '1') where.push('p.is_free_delivery = 1');
  if (req.query.combo === '1') where.push('p.is_combo = 1');
  if (req.query.combo === '0') where.push('p.is_combo = 0');
  if (req.query.low === '1') where.push('(SELECT COALESCE(SUM(s.stock),0) FROM product_variants s WHERE s.product_id = p.id) <= p.low_stock_level');
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const order = {
    position: '(p.sort_position = 0), p.sort_position, p.id DESC', views: 'p.view_count DESC, p.id DESC',
    stock: 'stock_total ASC, p.id DESC', sold: 'p.sold_count DESC, p.id DESC', newest: 'p.id DESC',
  }[req.query.sort || 'newest'] || 'p.id DESC';
  const [[count]] = await pool.query(`SELECT COUNT(*) AS n FROM products p ${clause}`, params);
  const [rows] = await pool.query(`
    SELECT p.id, p.name, p.slug, p.status, p.sort_position, p.is_free_delivery, p.is_combo, p.is_featured, p.view_count, p.sold_count,
           p.low_stock_level, p.category_id, c.name AS category_name, ${IMAGE_SQL} AS image_url,
           (SELECT COALESCE(SUM(s.stock),0) FROM product_variants s WHERE s.product_id = p.id) AS stock_total,
           (SELECT MIN(s.price) FROM product_variants s WHERE s.product_id = p.id) AS min_price,
           (SELECT COUNT(*) FROM product_variants s WHERE s.product_id = p.id) AS variant_count
    FROM products p JOIN categories c ON c.id = p.category_id ${clause}
    ORDER BY ${order} LIMIT ? OFFSET ?`, [...params, list.limit, list.offset]);
  res.json(pageResult(rows.map((r) => ({
    ...r, stock_total: Number(r.stock_total), min_price: Number(r.min_price), is_low: Number(r.stock_total) <= Number(r.low_stock_level),
  })), Number(count.n), list));
});

const updateMeta = route(async (req, res) => {
  const id = intParam(req.params.id, 'product ID');
  const b = req.body || {};
  const sets = [];
  const params = [];
  if (b.sort_position !== undefined) {
    const n = Number(b.sort_position);
    if (!Number.isInteger(n) || n < 0 || n > 100000) throw new HttpError(400, 'Position must be 0 or a positive whole number.');
    sets.push('sort_position = ?'); params.push(n);
  }
  if (b.is_free_delivery !== undefined) { sets.push('is_free_delivery = ?'); params.push(b.is_free_delivery ? 1 : 0); }
  if (b.low_stock_level !== undefined) {
    const n = Number(b.low_stock_level);
    if (!Number.isInteger(n) || n < 0 || n > 100000) throw new HttpError(400, 'Low stock level is invalid.');
    sets.push('low_stock_level = ?'); params.push(n);
  }
  if (b.is_featured !== undefined) { sets.push('is_featured = ?'); params.push(b.is_featured ? 1 : 0); }
  if (b.meta_title !== undefined) { sets.push('meta_title = ?'); params.push(text(b.meta_title, 'Meta title', { max: 160 })); }
  if (b.meta_description !== undefined) { sets.push('meta_description = ?'); params.push(text(b.meta_description, 'Meta description', { max: 300 })); }
  if (!sets.length) throw new HttpError(400, 'Nothing to update.');
  const [result] = await pool.query(`UPDATE products SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
  if (!result.affectedRows) throw new HttpError(404, 'Product not found.');
  res.json({ ok: true });
});

const reorder = route(async (req, res) => {
  const items = Array.isArray(req.body?.items) ? req.body.items.slice(0, 500) : [];
  if (!items.length) throw new HttpError(400, 'Nothing to reorder.');
  await withTx(async (conn) => {
    for (const item of items) {
      const id = intParam(item.id, 'product ID');
      const position = Number(item.position);
      if (!Number.isInteger(position) || position < 0 || position > 100000) throw new HttpError(400, 'A position is invalid.');
      await conn.query('UPDATE products SET sort_position = ? WHERE id = ?', [position, id]);
    }
  });
  res.json({ ok: true });
});

const listVariants = route(async (req, res) => {
  const productId = req.query.product_id ? intParam(req.query.product_id) : null;
  const ids = String(req.query.ids || '').split(',').map(Number).filter((n) => Number.isSafeInteger(n) && n > 0).slice(0, 200);
  const where = [];
  const params = [];
  if (productId) { where.push('v.product_id = ?'); params.push(productId); }
  if (ids.length) { where.push(`v.id IN (${ids.map(() => '?').join(',')})`); params.push(...ids); }
  if (req.query.q) {
    const like = `%${likeEscape(String(req.query.q).slice(0, 100))}%`;
    where.push('(p.name LIKE ? OR v.sku LIKE ? OR v.barcode LIKE ?)'); params.push(like, like, like);
  }
  if (req.query.sellable === '1') where.push("p.status = 'active' AND p.is_active = 1");
  const [rows] = await pool.query(`
    SELECT v.id, v.product_id, v.sku, COALESCE(v.barcode, v.sku) AS barcode, v.label, v.price, v.cost_price, v.stock, p.name, p.is_combo,
           ${IMAGE_SQL} AS image_url
    FROM product_variants v JOIN products p ON p.id = v.product_id
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY p.name, v.id LIMIT ?`, [...params, Math.min(Number(req.query.limit) || 60, 300)]);
  res.json({ items: rows.map((r) => ({ ...r, price: Number(r.price), cost_price: Number(r.cost_price) })) });
});

const updateVariant = route(async (req, res) => {
  const id = intParam(req.params.id, 'variant ID');
  const b = req.body || {};
  const sets = [];
  const params = [];
  if (b.cost_price !== undefined) { sets.push('cost_price = ?'); params.push(money(b.cost_price, 'Cost price')); }
  if (b.barcode !== undefined) { sets.push('barcode = ?'); params.push(text(b.barcode, 'Barcode', { max: 64 })); }
  if (!sets.length) throw new HttpError(400, 'Nothing to update.');
  const [result] = await pool.query(`UPDATE product_variants SET ${sets.join(', ')} WHERE id = ?`, [...params, id]);
  if (!result.affectedRows) throw new HttpError(404, 'Variant not found.');
  res.json({ ok: true });
});

const lowStock = route(async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT v.id, v.sku, v.label, v.stock, p.id AS product_id, p.name, p.low_stock_level, ${IMAGE_SQL} AS image_url
    FROM product_variants v JOIN products p ON p.id = v.product_id
    WHERE p.status = 'active' AND p.is_combo = 0 AND v.stock <= p.low_stock_level
    ORDER BY v.stock, p.name LIMIT 300`);
  res.json({ items: rows });
});

const ledger = route(async (req, res) => {
  const list = paging(req.query, { defaultLimit: 50 });
  const where = [];
  const params = [];
  if (req.query.variant_id) { where.push('m.variant_id = ?'); params.push(intParam(req.query.variant_id)); }
  if (req.query.product_id) { where.push('m.product_id = ?'); params.push(intParam(req.query.product_id)); }
  if (req.query.type && req.query.type !== 'all') { where.push('m.movement_type = ?'); params.push(String(req.query.type)); }
  const from = dateOnly(req.query.from, 'From date', { required: false });
  const to = dateOnly(req.query.to, 'To date', { required: false });
  if (from) { where.push('m.created_at >= ?'); params.push(`${from} 00:00:00`); }
  if (to) { where.push('m.created_at < DATE_ADD(?, INTERVAL 1 DAY)'); params.push(`${to} 00:00:00`); }
  if (req.query.q) {
    const like = `%${likeEscape(String(req.query.q).slice(0, 100))}%`;
    where.push('(p.name LIKE ? OR v.sku LIKE ?)'); params.push(like, like);
  }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const join = 'JOIN product_variants v ON v.id = m.variant_id JOIN products p ON p.id = m.product_id LEFT JOIN admin_users u ON u.id = m.admin_id';
  const [[count]] = await pool.query(`SELECT COUNT(*) AS n FROM stock_movements m ${join} ${clause}`, params);
  const [rows] = await pool.query(`
    SELECT m.id, m.movement_type, m.qty_change, m.balance_after, m.unit_cost, m.ref_type, m.ref_id, m.note, m.created_at,
           v.sku, v.label, p.name, u.username AS admin
    FROM stock_movements m ${join} ${clause} ORDER BY m.id DESC LIMIT ? OFFSET ?`, [...params, list.limit, list.offset]);
  res.json(pageResult(rows, Number(count.n), list));
});

const adjustStock = route(async (req, res) => {
  const variantId = intParam(req.body?.variantId, 'variant');
  const change = Number(req.body?.change);
  if (!Number.isInteger(change) || change === 0 || Math.abs(change) > 1000000) throw new HttpError(400, 'Enter a whole-number change (positive or negative).');
  const note = text(req.body?.note, 'Reason', { max: 255, required: true });
  const out = await withTx((conn) => adjust(conn, { variantId, change, type: 'adjustment', note, adminId: req.adminUser.id }));
  await audit(req.adminUser.id, 'stock_adjust', 'variant', variantId, `${change} (${note})`);
  res.json({ ok: true, balance: out.balance });
});

const listDamages = route(async (req, res) => {
  const list = paging(req.query);
  const [[count]] = await pool.query('SELECT COUNT(*) AS n, COALESCE(SUM(qty * unit_cost),0) AS loss FROM damage_records');
  const [rows] = await pool.query(`
    SELECT d.id, d.qty, d.unit_cost, d.qty * d.unit_cost AS loss, d.reason, d.created_at, v.sku, v.label, p.name, u.username AS admin
    FROM damage_records d JOIN product_variants v ON v.id = d.variant_id JOIN products p ON p.id = d.product_id
    LEFT JOIN admin_users u ON u.id = d.admin_id ORDER BY d.id DESC LIMIT ? OFFSET ?`, [list.limit, list.offset]);
  res.json({ ...pageResult(rows.map((r) => ({ ...r, loss: Number(r.loss) })), Number(count.n), list), totalLoss: Number(count.loss) });
});

const createDamage = route(async (req, res) => {
  const variantId = intParam(req.body?.variantId, 'variant');
  const qty = Number(req.body?.qty);
  if (!Number.isInteger(qty) || qty < 1 || qty > 1000000) throw new HttpError(400, 'Quantity must be a positive whole number.');
  const reason = text(req.body?.reason, 'Reason', { max: 255, required: true });
  const record = await withTx(async (conn) => {
    const [[v]] = await conn.query('SELECT id, product_id, cost_price FROM product_variants WHERE id = ?', [variantId]);
    if (!v) throw new HttpError(404, 'Variant not found.');
    const [created] = await conn.query('INSERT INTO damage_records (variant_id, product_id, qty, unit_cost, reason, admin_id) VALUES (?,?,?,?,?,?)',
      [variantId, v.product_id, qty, v.cost_price, reason, req.adminUser.id]);
    await adjust(conn, { variantId, change: -qty, type: 'damage', refType: 'damage', refId: created.insertId, note: reason, adminId: req.adminUser.id, unitCost: v.cost_price });
    return created.insertId;
  });
  res.status(201).json({ id: record });
});

const viewsReport = route(async (req, res) => {
  const days = Math.min(90, Math.max(1, Number(req.query.days) || 30));
  const [top] = await pool.query(`
    SELECT p.id, p.name, p.slug, p.view_count, p.sold_count, ${IMAGE_SQL} AS image_url,
           COALESCE((SELECT SUM(d.views) FROM product_views_daily d WHERE d.product_id = p.id AND d.view_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY)), 0) AS recent_views
    FROM products p ORDER BY recent_views DESC, p.view_count DESC LIMIT 50`, [days]);
  const [daily] = await pool.query(
    'SELECT view_date AS day, SUM(views) AS views FROM product_views_daily WHERE view_date >= DATE_SUB(CURDATE(), INTERVAL ? DAY) GROUP BY view_date ORDER BY view_date', [days]);
  res.json({ days, top: top.map((r) => ({ ...r, recent_views: Number(r.recent_views) })), daily: daily.map((d) => ({ day: d.day, views: Number(d.views) })) });
});

const exportProducts = route(async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT p.id AS product_id, p.name, c.name AS category, b.name AS brand, p.status, v.id AS variant_id, v.sku, COALESCE(v.barcode, v.sku) AS barcode,
           v.label, v.price, v.compare_at_price, v.cost_price, v.stock, p.sold_count, p.view_count
    FROM products p JOIN categories c ON c.id = p.category_id LEFT JOIN brands b ON b.id = p.brand_id
    JOIN product_variants v ON v.product_id = p.id ORDER BY p.id, v.id LIMIT 20000`);
  res.json({ items: rows });
});

// ----------------------------------------------------------------- combos
async function readCombo(id) {
  const [[combo]] = await pool.query(`
    SELECT p.id, p.name, p.slug, p.short_desc, p.description, p.status, p.category_id, p.sort_position, p.gift_mode, ${IMAGE_SQL} AS image_url,
           v.id AS variant_id, v.sku, v.price, v.compare_at_price, v.stock
    FROM products p JOIN product_variants v ON v.product_id = p.id WHERE p.id = ? AND p.is_combo = 1 LIMIT 1`, [id]);
  if (!combo) return null;
  const [items] = await pool.query(`
    SELECT ci.variant_id, ci.qty, ci.role, v.sku, v.label, v.stock, v.price, p.name
    FROM combo_items ci JOIN product_variants v ON v.id = ci.variant_id JOIN products p ON p.id = v.product_id
    WHERE ci.combo_product_id = ? ORDER BY (ci.role = 'gift'), ci.id`, [id]);
  const regular = items.reduce((s, i) => s + Number(i.price) * Number(i.qty), 0);
  return { ...combo, price: Number(combo.price), compare_at_price: combo.compare_at_price == null ? null : Number(combo.compare_at_price), items: items.map((i) => ({ ...i, price: Number(i.price) })), regular_total: regular };
}

const listCombos = route(async (_req, res) => {
  const [rows] = await pool.query(`
    SELECT p.id, p.name, p.slug, p.status, p.gift_mode, ${IMAGE_SQL} AS image_url, v.price, v.stock,
           (SELECT COUNT(*) FROM combo_items ci WHERE ci.combo_product_id = p.id) AS item_count
    FROM products p JOIN product_variants v ON v.product_id = p.id WHERE p.is_combo = 1 ORDER BY p.id DESC`);
  res.json({ items: rows.map((r) => ({ ...r, price: Number(r.price) })) });
});

const getCombo = route(async (req, res) => {
  const combo = await readCombo(intParam(req.params.id));
  if (!combo) throw new HttpError(404, 'Combo not found.');
  res.json(combo);
});

function parseCombo(body) {
  const name = text(body.name, 'Name', { max: 200, required: true });
  const price = money(body.price, 'Combo price', { allowZero: false });
  const categoryId = intParam(body.category_id, 'category');
  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length < 2 || items.length > 30) throw new HttpError(400, 'A combo needs a main product and at least one free gift.');
  const seen = new Set();
  const parsed = items.map((i) => {
    const variantId = intParam(i.variantId, 'variant');
    const qty = Number(i.qty);
    if (!Number.isInteger(qty) || qty < 1 || qty > 100) throw new HttpError(400, 'A combo quantity is invalid.');
    if (seen.has(variantId)) throw new HttpError(400, 'A product appears twice in the combo.');
    seen.add(variantId);
    return { variantId, qty, role: i.role === 'gift' ? 'gift' : 'main' };
  });
  if (parsed.filter((i) => i.role === 'main').length !== 1) throw new HttpError(400, 'Choose exactly one main product.');
  if (!parsed.some((i) => i.role === 'gift')) throw new HttpError(400, 'Add at least one free gift product.');
  return {
    name, price, categoryId, items: parsed,
    giftMode: body.gift_mode === 'with_main' ? 'with_main' : 'combo_only',
    compare: body.compare_at_price === undefined || body.compare_at_price === '' || body.compare_at_price === null ? null : money(body.compare_at_price, 'Regular price'),
    short: text(body.short_desc, 'Short description', { max: 300 }), description: text(body.description, 'Description', { max: 30000 }),
    image: text(body.image_url, 'Image', { max: 500 }), status: ['draft', 'active', 'archived'].includes(body.status) ? body.status : 'draft',
  };
}

const slugOf = (s) => String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 190) || 'combo';

async function checkComponents(conn, items) {
  for (const item of items) {
    const [[v]] = await conn.query('SELECT v.id, p.is_combo FROM product_variants v JOIN products p ON p.id = v.product_id WHERE v.id = ?', [item.variantId]);
    if (!v) throw new HttpError(400, 'A selected product no longer exists.');
    if (v.is_combo) throw new HttpError(400, 'A combo cannot contain another combo.');
  }
}

const createCombo = route(async (req, res) => {
  const c = parseCombo(req.body || {});
  const id = await withTx(async (conn) => {
    await checkComponents(conn, c.items);
    const slug = `${slugOf(c.name)}-${Date.now().toString(36).slice(-4)}`;
    const [p] = await conn.query(`INSERT INTO products (category_id, name, slug, short_desc, description, image_url, is_active, status, is_combo, gift_mode)
      VALUES (?,?,?,?,?,?,?,?,1,?)`, [c.categoryId, c.name, slug, c.short, c.description, c.image, c.status === 'active' ? 1 : 0, c.status, c.giftMode]);
    await conn.query("INSERT INTO product_variants (product_id, sku, label, price, compare_at_price, stock, is_default) VALUES (?,?,'Combo',?,?,0,1)",
      [p.insertId, `COMBO-${p.insertId}`, c.price, c.compare]);
    for (const item of c.items) await conn.query('INSERT INTO combo_items (combo_product_id, variant_id, qty, role) VALUES (?,?,?,?)', [p.insertId, item.variantId, item.qty, item.role]);
    await syncCombo(conn, p.insertId);
    return p.insertId;
  });
  await audit(req.adminUser.id, 'create', 'combo', id);
  res.status(201).json(await readCombo(id));
});

const updateCombo = route(async (req, res) => {
  const id = intParam(req.params.id);
  const c = parseCombo(req.body || {});
  await withTx(async (conn) => {
    const [[exists]] = await conn.query('SELECT id FROM products WHERE id = ? AND is_combo = 1 FOR UPDATE', [id]);
    if (!exists) throw new HttpError(404, 'Combo not found.');
    await checkComponents(conn, c.items);
    await conn.query(`UPDATE products SET category_id = ?, name = ?, short_desc = ?, description = ?, image_url = ?, is_active = ?, status = ?, gift_mode = ? WHERE id = ?`,
      [c.categoryId, c.name, c.short, c.description, c.image, c.status === 'active' ? 1 : 0, c.status, c.giftMode, id]);
    await conn.query('UPDATE product_variants SET price = ?, compare_at_price = ? WHERE product_id = ?', [c.price, c.compare, id]);
    await conn.query('DELETE FROM combo_items WHERE combo_product_id = ?', [id]);
    for (const item of c.items) await conn.query('INSERT INTO combo_items (combo_product_id, variant_id, qty, role) VALUES (?,?,?,?)', [id, item.variantId, item.qty, item.role]);
    await syncCombo(conn, id);
  });
  res.json(await readCombo(id));
});

module.exports = {
  listProducts, updateMeta, reorder, listVariants, updateVariant, lowStock, ledger, adjustStock,
  listDamages, createDamage, viewsReport, exportProducts, listCombos, getCombo, createCombo, updateCombo,
};
