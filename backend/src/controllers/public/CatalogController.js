'use strict';

const { pool } = require('../../../db');
const {
  categoryTree,
  enrichCategories,
  siblingCategoryIds,
} = require('../../utils/public-category-tree');

async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function one(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0];
}

// Keep all public image sources in the existing database. A product-gallery
// image is used if no primary image has been configured on the product row.
const PRODUCT_IMAGE_SQL = `COALESCE(NULLIF(p.image_url, ''), (
  SELECT pi.url FROM product_images pi
  WHERE pi.product_id = p.id ORDER BY pi.sort_order, pi.id LIMIT 1
))`;

const PUBLIC_PRODUCT_SQL = `
  SELECT p.id, p.name, p.slug, p.short_desc, p.emoji,
         ${PRODUCT_IMAGE_SQL} AS image_url,
         p.sold_count, p.gift_mode, c.name AS category_name, c.slug AS category_slug,
         b.name AS brand_name, b.slug AS brand_slug,
         v.id AS variant_id, v.label AS variant_label, v.price,
         v.compare_at_price, v.stock, p.is_free_delivery, p.is_combo,
         (SELECT ROUND(AVG(rating), 1) FROM reviews r
          WHERE r.product_id = p.id AND r.status = 'approved') AS rating,
         (SELECT COUNT(*) FROM reviews r WHERE r.product_id = p.id AND r.status = 'approved') AS review_count
  FROM products p
  JOIN categories c ON c.id = p.category_id AND c.is_active = 1
  JOIN product_variants v ON v.product_id = p.id AND v.is_default = 1
  LEFT JOIN brands b ON b.id = p.brand_id AND b.is_active = 1
`;

function asJson(value) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

const ACTIVE_CATEGORIES_SQL = `
  SELECT id, parent_id, name, slug, emoji, image_url, sort_order
  FROM categories WHERE is_active = 1
  ORDER BY sort_order, id
`;

async function categories(_req, res) {
  const [rows, summaries] = await Promise.all([
    query(ACTIVE_CATEGORIES_SQL),
    query(`
      SELECT p.category_id, COUNT(*) AS product_count,
        (
          SELECT ${PRODUCT_IMAGE_SQL.replaceAll('p.', 'photo.')}
          FROM products photo
          WHERE photo.category_id = p.category_id
            AND photo.is_active = 1 AND photo.status = 'active'
            AND EXISTS (
              SELECT 1 FROM product_variants pv
              WHERE pv.product_id = photo.id AND pv.is_default = 1
            )
            AND (NULLIF(photo.image_url, '') IS NOT NULL OR EXISTS (
              SELECT 1 FROM product_images img WHERE img.product_id = photo.id
            ))
          ORDER BY photo.sold_count DESC, photo.id DESC
          LIMIT 1
        ) AS representative_image
      FROM products p
      JOIN categories c ON c.id = p.category_id AND c.is_active = 1
      WHERE p.is_active = 1 AND p.status = 'active'
        AND EXISTS (
          SELECT 1 FROM product_variants pv
          WHERE pv.product_id = p.id AND pv.is_default = 1
        )
      GROUP BY p.category_id
    `),
  ]);

  res.json(enrichCategories(rows, summaries));
}

async function products(req, res) {
  const { category, q, sort = 'popular', deal, brand, combo } = req.query;
  const rawLimit = Number(req.query.limit || 48);
  const limit = Number.isInteger(rawLimit) && rawLimit >= 1
    ? Math.min(rawLimit, 100)
    : 48;

  const conditions = ["p.is_active = 1", "p.status = 'active'"];
  const args = [];

  if (category) {
    const active = await query('SELECT id, parent_id, slug FROM categories WHERE is_active = 1');
    const selected = active.find((item) => item.slug === String(category));
    const ids = selected ? categoryTree(active).descendants(selected.id) : [];

    if (ids.length) {
      conditions.push(`p.category_id IN (${ids.map(() => '?').join(', ')})`);
      args.push(...ids);
    } else {
      conditions.push('1 = 0');
    }
  }

  if (q && String(q).trim()) {
    conditions.push('(p.name LIKE ? OR p.short_desc LIKE ?)');
    const search = String(q).trim().slice(0, 100);
    args.push(`%${search}%`, `%${search}%`);
  }

  if (deal) conditions.push('v.compare_at_price IS NOT NULL');
  if (combo) conditions.push('p.is_combo = 1');
  if (brand) { conditions.push('b.slug = ?'); args.push(String(brand).slice(0, 140)); }

  const orderBy = {
    // Products with an admin-set position come first, in that order; the rest follow by sales.
    popular: '(p.sort_position = 0), p.sort_position, p.sold_count DESC',
    price_asc: 'v.price ASC',
    price_desc: 'v.price DESC',
    newest: 'p.id DESC',
  }[sort] || '(p.sort_position = 0), p.sort_position, p.sold_count DESC';

  const rows = await query(`
    ${PUBLIC_PRODUCT_SQL}
    WHERE ${conditions.join(' AND ')}
    ORDER BY ${orderBy}, p.id DESC
    LIMIT ?
  `, [...args, limit]);

  if (combo && rows.length) {
    const parts = await query(`
      SELECT ci.combo_product_id, ci.role, ci.qty, p.name, v.label
      FROM combo_items ci JOIN product_variants v ON v.id = ci.variant_id JOIN products p ON p.id = v.product_id
      WHERE ci.combo_product_id IN (${rows.map(() => '?').join(',')}) ORDER BY (ci.role = 'gift'), ci.id`, rows.map((r) => r.id));
    for (const row of rows) row.items = parts.filter((x) => x.combo_product_id === row.id).map(({ role, qty, name, label }) => ({ role, qty, name, label }));
  }
  res.json(rows);
}

async function brands(_req, res) {
  res.json(await query(`
    SELECT b.id, b.name, b.slug, b.logo_url, COUNT(p.id) AS product_count
    FROM brands b
    JOIN products p ON p.brand_id = b.id AND p.is_active = 1 AND p.status = 'active'
    WHERE b.is_active = 1
    GROUP BY b.id ORDER BY b.name`));
}

// Items inside a combo, split into the main product and its free gifts.
async function comboItems(comboId) {
  return query(`
    SELECT ci.role, ci.qty, v.label, p.name, p.slug,
           ${PRODUCT_IMAGE_SQL} AS image_url, v.price
    FROM combo_items ci
    JOIN product_variants v ON v.id = ci.variant_id
    JOIN products p ON p.id = v.product_id
    WHERE ci.combo_product_id = ? ORDER BY (ci.role = 'gift'), ci.id`, [comboId]);
}

async function productDetails(req, res) {
  const product = await one(`
    SELECT p.*, c.name AS category_name, c.slug AS category_slug,
           b.name AS brand_name, b.slug AS brand_slug
    FROM products p
    JOIN categories c ON c.id = p.category_id AND c.is_active = 1
    LEFT JOIN brands b ON b.id = p.brand_id
    WHERE p.slug = ? AND p.is_active = 1 AND p.status = 'active'
  `, [req.params.slug]);

  if (!product) return res.status(404).json({ error: 'Product not found.' });

  const [variants, images, reviews, aggregate, optionRows, mappingRows, specRows, activeCategories] = await Promise.all([
    query(`
      SELECT id, sku, label, price, compare_at_price, stock, is_default
      FROM product_variants WHERE product_id = ? ORDER BY id
    `, [product.id]),
    query(`
      SELECT url, alt, variant_id FROM product_images
      WHERE product_id = ? ORDER BY sort_order, id
    `, [product.id]),
    query(`
      SELECT author, rating, body, admin_reply, created_at FROM reviews
      WHERE product_id = ? AND status = 'approved' ORDER BY id DESC LIMIT 20
    `, [product.id]),
    one(`
      SELECT ROUND(AVG(rating), 1) AS rating, COUNT(*) AS n
      FROM reviews WHERE product_id = ? AND status = 'approved'
    `, [product.id]),
    query(`
      SELECT po.id AS option_id, po.name AS option_name,
             pov.id AS value_id, pov.value
      FROM product_options po
      LEFT JOIN product_option_values pov ON pov.option_id = po.id
      WHERE po.product_id = ?
      ORDER BY po.sort_order, po.id, pov.sort_order, pov.id
    `, [product.id]),
    query(`
      SELECT vov.variant_id, vov.option_value_id
      FROM variant_option_values vov
      JOIN product_variants pv ON pv.id = vov.variant_id
      WHERE pv.product_id = ?
    `, [product.id]),
    query(`
      SELECT a.name, a.data_type, a.unit, a.code,
             pav.value_text, pav.value_number, pav.value_boolean,
             pav.value_date, pav.value_json
      FROM product_attribute_values pav
      JOIN attribute_definitions a ON a.id = pav.attribute_id
      JOIN product_type_attributes pta ON pta.attribute_id = a.id
        AND pta.product_type_id = ? AND pta.is_visible = 1
      WHERE pav.product_id = ?
      ORDER BY pta.sort_order, a.id
    `, [product.product_type_id || 0, product.id]),
    query('SELECT id, parent_id FROM categories WHERE is_active = 1'),
  ]);

  const optionsById = new Map();

  for (const row of optionRows) {
    if (!optionsById.has(row.option_id)) {
      optionsById.set(row.option_id, {
        id: row.option_id,
        name: row.option_name,
        values: [],
      });
    }

    if (row.value_id != null) {
      optionsById.get(row.option_id).values.push({
        id: row.value_id,
        value: row.value,
      });
    }
  }

  const optionMapping = new Map();

  for (const row of mappingRows) {
    if (!optionMapping.has(row.variant_id)) optionMapping.set(row.variant_id, []);
    optionMapping.get(row.variant_id).push(row.option_value_id);
  }

  const specifications = specRows.map((row) => {
    let value = row.value_text;
    if (row.data_type === 'number') value = row.value_number;
    if (row.data_type === 'boolean') value = Boolean(row.value_boolean);
    if (row.data_type === 'date') value = row.value_date;
    if (row.data_type === 'multiselect') value = asJson(row.value_json);

    return { code: row.code, name: row.name, value, unit: row.unit };
  });

  // Prioritize the exact category, then sibling categories under the same
  // parent. Do not substitute unrelated items under the same category title.
  const familyIds = siblingCategoryIds(activeCategories, product.category_id);
  const otherFamilyIds = familyIds.filter((id) => id !== Number(product.category_id));
  let related = await query(`
    ${PUBLIC_PRODUCT_SQL}
    WHERE p.id <> ? AND p.is_active = 1 AND p.status = 'active'
      AND p.category_id IN (${[product.category_id, ...otherFamilyIds].map(() => '?').join(', ')})
    ORDER BY CASE WHEN p.category_id = ? THEN 0 ELSE 1 END,
             p.sold_count DESC, p.id DESC
    LIMIT 8
  `, [product.id, product.category_id, ...otherFamilyIds, product.category_id]);

  let relatedScope = related.length ? 'category_family' : 'store';

  if (!related.length) {
    related = await query(`
      ${PUBLIC_PRODUCT_SQL}
      WHERE p.id <> ? AND p.is_active = 1 AND p.status = 'active'
      ORDER BY p.sold_count DESC, p.id DESC
      LIMIT 8
    `, [product.id]);
  }

  // Combos where this product is the main item (shown as the "free gifts" box), or this combo's own contents.
  let combos = [];
  let comboContents = [];
  if (product.is_combo) {
    comboContents = await comboItems(product.id);
  } else {
    const rows = await query(`
      SELECT DISTINCT cp.id, cp.name, cp.slug, cp.gift_mode, ${PRODUCT_IMAGE_SQL.replaceAll('p.', 'cp.')} AS image_url,
             cv.price, cv.compare_at_price, cv.stock
      FROM combo_items mi
      JOIN products cp ON cp.id = mi.combo_product_id AND cp.is_combo = 1 AND cp.is_active = 1 AND cp.status = 'active'
      JOIN product_variants cv ON cv.product_id = cp.id AND cv.is_default = 1
      WHERE mi.role = 'main' AND mi.variant_id IN (SELECT id FROM product_variants WHERE product_id = ?)`, [product.id]);
    for (const row of rows) {
      const gifts = (await comboItems(row.id)).filter((i) => i.role === 'gift');
      if (gifts.length) combos.push({ ...row, gifts });
    }
  }

  res.json({
    ...product,
    combos,
    combo_items: comboContents,
    image_url: product.image_url || images[0]?.url || null,
    nutrition: asJson(product.nutrition),
    variants: variants.map((variant) => ({
      ...variant,
      optionValueIds: optionMapping.get(variant.id) || [],
    })),
    options: [...optionsById.values()],
    specifications,
    images,
    reviews,
    rating: aggregate?.rating ?? null,
    review_count: aggregate?.n ?? 0,
    related,
    related_scope: relatedScope,
  });
}

module.exports = { categories, products, productDetails, brands };
