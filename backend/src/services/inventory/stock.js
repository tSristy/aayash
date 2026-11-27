'use strict';

const { HttpError } = require('../../lib/http');

/**
 * Single entry point for every stock change. Locks the variant row, refuses to
 * go negative, updates the stock and writes the ledger row in the caller's
 * transaction. Combo products are virtual: selling one moves its components.
 */
async function moveSimple(conn, { variantId, change, type, refType = null, refId = null, note = null, adminId = null, unitCost = null, allowNegative = false }) {
  const [[variant]] = await conn.query(
    'SELECT id, product_id, stock, sku FROM product_variants WHERE id = ? FOR UPDATE', [variantId]
  );
  if (!variant) throw new HttpError(400, 'A product variant no longer exists.');
  const next = Number(variant.stock) + change;
  if (next < 0 && !allowNegative) {
    throw new HttpError(409, `Not enough stock for ${variant.sku}. Available: ${variant.stock}.`);
  }
  await conn.query('UPDATE product_variants SET stock = ? WHERE id = ?', [next, variantId]);
  await conn.query(`
    INSERT INTO stock_movements (variant_id, product_id, movement_type, qty_change, balance_after, unit_cost, ref_type, ref_id, note, admin_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  [variantId, variant.product_id, type, change, next, unitCost, refType, refId, note, adminId]);
  return { variantId, productId: variant.product_id, balance: next };
}

async function comboComponents(conn, variantId) {
  const [rows] = await conn.query(`
    SELECT ci.variant_id, ci.qty
    FROM product_variants v
    JOIN products p ON p.id = v.product_id AND p.is_combo = 1
    JOIN combo_items ci ON ci.combo_product_id = p.id
    WHERE v.id = ?
    ORDER BY ci.variant_id`, [variantId]);
  return rows;
}

// Recompute the sellable stock of combo variants that use any of these components.
async function syncCombos(conn, componentVariantIds) {
  if (!componentVariantIds.length) return;
  const [combos] = await conn.query(`
    SELECT DISTINCT ci.combo_product_id FROM combo_items ci
    WHERE ci.variant_id IN (${componentVariantIds.map(() => '?').join(',')})`, componentVariantIds);
  for (const { combo_product_id: comboId } of combos) await syncCombo(conn, comboId);
}

async function syncCombo(conn, comboProductId) {
  const [items] = await conn.query(`
    SELECT ci.qty, v.stock FROM combo_items ci
    JOIN product_variants v ON v.id = ci.variant_id
    WHERE ci.combo_product_id = ?`, [comboProductId]);
  const available = items.length
    ? Math.min(...items.map((i) => Math.floor(Number(i.stock) / Number(i.qty))))
    : 0;
  await conn.query('UPDATE product_variants SET stock = ? WHERE product_id = ?', [Math.max(0, available), comboProductId]);
}

/**
 * Apply a list of order lines. direction -1 removes stock (sale), +1 restores it.
 * lines: [{ variantId, qty }]. Sorted by id to avoid deadlocks.
 */
async function applyLines(conn, lines, direction, meta) {
  const plan = new Map();
  const touched = new Set();
  for (const line of lines) {
    const components = await comboComponents(conn, line.variantId);
    if (components.length) {
      for (const c of components) {
        plan.set(c.variant_id, (plan.get(c.variant_id) || 0) + c.qty * line.qty);
        touched.add(c.variant_id);
      }
    } else {
      plan.set(line.variantId, (plan.get(line.variantId) || 0) + line.qty);
    }
  }
  for (const variantId of [...plan.keys()].sort((a, b) => a - b)) {
    await moveSimple(conn, { ...meta, variantId, change: direction * plan.get(variantId) });
  }
  await syncCombos(conn, [...touched, ...plan.keys()]);
}

async function adjust(conn, args) {
  const result = await moveSimple(conn, args);
  await syncCombos(conn, [args.variantId]);
  return result;
}

module.exports = { moveSimple, applyLines, adjust, syncCombo, syncCombos, comboComponents };
