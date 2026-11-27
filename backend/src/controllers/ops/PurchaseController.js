'use strict';

const { pool } = require('../../../db');
const { HttpError, route, withTx, intParam, money, text, dateOnly, today, paging, pageResult, likeEscape, audit } = require('../../lib/http');
const { moveSimple, syncCombos } = require('../../services/inventory/stock');
const { addTransaction } = require('../../services/accounts/ledger');

const SUPPLIER_DUE_SQL = `(s.opening_due + COALESCE((SELECT SUM(p.total - p.paid) FROM purchases p WHERE p.supplier_id = s.id AND p.status = 'received'), 0))`;

const listSuppliers = route(async (req, res) => {
  const list = paging(req.query);
  const where = [];
  const params = [];
  if (req.query.q) {
    const like = `%${likeEscape(String(req.query.q).slice(0, 100))}%`;
    where.push('(s.name LIKE ? OR s.phone LIKE ?)'); params.push(like, like);
  }
  if (req.query.active === '1') where.push('s.is_active = 1');
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [[count]] = await pool.query(`SELECT COUNT(*) AS n FROM suppliers s ${clause}`, params);
  const [rows] = await pool.query(`
    SELECT s.*, ${SUPPLIER_DUE_SQL} AS due,
      COALESCE((SELECT SUM(p.total) FROM purchases p WHERE p.supplier_id = s.id AND p.status = 'received'), 0) AS purchased
    FROM suppliers s ${clause} ORDER BY s.id DESC LIMIT ? OFFSET ?`, [...params, list.limit, list.offset]);
  res.json(pageResult(rows.map((r) => ({ ...r, due: Number(r.due), purchased: Number(r.purchased), opening_due: Number(r.opening_due) })), Number(count.n), list));
});

const getSupplier = route(async (req, res) => {
  const id = intParam(req.params.id);
  const [[supplier]] = await pool.query(`SELECT s.*, ${SUPPLIER_DUE_SQL} AS due FROM suppliers s WHERE s.id = ?`, [id]);
  if (!supplier) throw new HttpError(404, 'Supplier not found.');
  const [purchases] = await pool.query("SELECT id, ref_no, purchase_date, total, paid, status FROM purchases WHERE supplier_id = ? ORDER BY id DESC LIMIT 100", [id]);
  const [payments] = await pool.query(`
    SELECT t.id, t.amount, t.txn_date, t.note, a.name AS account FROM transactions t JOIN accounts a ON a.id = t.account_id
    WHERE t.ref_type IN ('supplier_payment') AND t.ref_id = ? ORDER BY t.id DESC LIMIT 100`, [id]);
  res.json({ ...supplier, due: Number(supplier.due), opening_due: Number(supplier.opening_due), purchases: purchases.map((p) => ({ ...p, total: Number(p.total), paid: Number(p.paid) })), payments: payments.map((p) => ({ ...p, amount: Number(p.amount) })) });
});

function supplierInput(b) {
  return {
    name: text(b.name, 'Name', { max: 160, required: true }), phone: text(b.phone, 'Phone', { max: 30 }),
    email: text(b.email, 'Email', { max: 190 }), address: text(b.address, 'Address', { max: 255 }),
    opening_due: money(b.opening_due ?? 0, 'Opening due'), note: text(b.note, 'Note', { max: 500 }),
    is_active: b.is_active === undefined ? 1 : (b.is_active ? 1 : 0),
  };
}

const createSupplier = route(async (req, res) => {
  const d = supplierInput(req.body || {});
  const [r] = await pool.query('INSERT INTO suppliers (name, phone, email, address, opening_due, note, is_active) VALUES (?,?,?,?,?,?,?)',
    [d.name, d.phone, d.email, d.address, d.opening_due, d.note, d.is_active]);
  res.status(201).json({ id: r.insertId });
});

const updateSupplier = route(async (req, res) => {
  const id = intParam(req.params.id);
  const d = supplierInput(req.body || {});
  const [r] = await pool.query('UPDATE suppliers SET name=?, phone=?, email=?, address=?, opening_due=?, note=?, is_active=? WHERE id=?',
    [d.name, d.phone, d.email, d.address, d.opening_due, d.note, d.is_active, id]);
  if (!r.affectedRows) throw new HttpError(404, 'Supplier not found.');
  res.json({ ok: true });
});

const deleteSupplier = route(async (req, res) => {
  const id = intParam(req.params.id);
  const [[used]] = await pool.query('SELECT COUNT(*) AS n FROM purchases WHERE supplier_id = ?', [id]);
  if (Number(used.n)) throw new HttpError(409, 'This supplier has purchases. Mark it inactive instead.');
  await pool.query('DELETE FROM suppliers WHERE id = ?', [id]);
  res.json({ ok: true });
});

/** Pay a supplier: oldest unpaid purchases first, any remainder reduces the opening due. */
const paySupplier = route(async (req, res) => {
  const id = intParam(req.params.id);
  const amount = money(req.body?.amount, 'Amount', { allowZero: false });
  const accountId = intParam(req.body?.accountId, 'account');
  await withTx(async (conn) => {
    const [[supplier]] = await conn.query('SELECT * FROM suppliers WHERE id = ? FOR UPDATE', [id]);
    if (!supplier) throw new HttpError(404, 'Supplier not found.');
    const [open] = await conn.query("SELECT id, total, paid FROM purchases WHERE supplier_id = ? AND status = 'received' AND paid < total ORDER BY purchase_date, id FOR UPDATE", [id]);
    const totalDue = open.reduce((s, p) => s + Number(p.total) - Number(p.paid), 0) + Number(supplier.opening_due);
    if (amount > totalDue + 0.001) throw new HttpError(400, `Payment exceeds the amount due (৳${totalDue.toFixed(2)}).`);
    let left = amount;
    for (const p of open) {
      if (left <= 0) break;
      const pay = Math.min(left, Number(p.total) - Number(p.paid));
      await conn.query('UPDATE purchases SET paid = paid + ? WHERE id = ?', [pay, p.id]);
      left = Math.round((left - pay) * 100) / 100;
    }
    if (left > 0) await conn.query('UPDATE suppliers SET opening_due = GREATEST(0, opening_due - ?) WHERE id = ?', [left, id]);
    await addTransaction(conn, { accountId, kind: 'expense', amount, purposeName: 'Purchase', date: req.body?.date ? dateOnly(req.body.date) : null,
      note: `Payment to ${supplier.name}${req.body?.note ? ` – ${String(req.body.note).slice(0, 200)}` : ''}`, refType: 'supplier_payment', refId: id, adminId: req.adminUser.id });
  });
  res.json({ ok: true });
});

// -------------------------------------------------------------- purchases
const listPurchases = route(async (req, res) => {
  const list = paging(req.query);
  const where = [];
  const params = [];
  if (req.query.supplier_id) { where.push('p.supplier_id = ?'); params.push(intParam(req.query.supplier_id)); }
  if (req.query.q) { where.push('(p.ref_no LIKE ? OR s.name LIKE ?)'); const like = `%${likeEscape(String(req.query.q).slice(0, 100))}%`; params.push(like, like); }
  if (req.query.status === 'due') where.push("p.status = 'received' AND p.paid < p.total");
  const from = dateOnly(req.query.from, 'From date', { required: false });
  const to = dateOnly(req.query.to, 'To date', { required: false });
  if (from) { where.push('p.purchase_date >= ?'); params.push(from); }
  if (to) { where.push('p.purchase_date <= ?'); params.push(to); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [[count]] = await pool.query(`SELECT COUNT(*) AS n FROM purchases p JOIN suppliers s ON s.id = p.supplier_id ${clause}`, params);
  const [rows] = await pool.query(`
    SELECT p.id, p.ref_no, p.purchase_date, p.total, p.paid, p.status, s.name AS supplier,
           (SELECT COUNT(*) FROM purchase_items i WHERE i.purchase_id = p.id) AS item_count
    FROM purchases p JOIN suppliers s ON s.id = p.supplier_id ${clause} ORDER BY p.id DESC LIMIT ? OFFSET ?`, [...params, list.limit, list.offset]);
  res.json(pageResult(rows.map((r) => ({ ...r, total: Number(r.total), paid: Number(r.paid), due: Number(r.total) - Number(r.paid) })), Number(count.n), list));
});

const getPurchase = route(async (req, res) => {
  const id = intParam(req.params.id);
  const [[purchase]] = await pool.query('SELECT p.*, s.name AS supplier FROM purchases p JOIN suppliers s ON s.id = p.supplier_id WHERE p.id = ?', [id]);
  if (!purchase) throw new HttpError(404, 'Purchase not found.');
  const [items] = await pool.query('SELECT i.*, v.sku, v.label FROM purchase_items i JOIN product_variants v ON v.id = i.variant_id WHERE i.purchase_id = ? ORDER BY i.id', [id]);
  res.json({ ...purchase, subtotal: Number(purchase.subtotal), discount: Number(purchase.discount), total: Number(purchase.total), paid: Number(purchase.paid), items: items.map((i) => ({ ...i, unit_cost: Number(i.unit_cost), line_total: Number(i.line_total) })) });
});

const createPurchase = route(async (req, res) => {
  const b = req.body || {};
  const supplierId = intParam(b.supplierId, 'supplier');
  const date = b.date ? dateOnly(b.date) : today();
  const items = Array.isArray(b.items) ? b.items : [];
  if (!items.length || items.length > 100) throw new HttpError(400, 'Add 1–100 products.');
  const discount = money(b.discount ?? 0, 'Discount');
  const paid = money(b.paid ?? 0, 'Paid amount');
  const id = await withTx(async (conn) => {
    const [[supplier]] = await conn.query('SELECT id, name, is_active FROM suppliers WHERE id = ? FOR UPDATE', [supplierId]);
    if (!supplier || !supplier.is_active) throw new HttpError(400, 'Choose an active supplier.');
    const lines = [];
    const seen = new Set();
    for (const raw of items) {
      const variantId = intParam(raw.variantId, 'variant');
      if (seen.has(variantId)) throw new HttpError(400, 'A product appears twice. Combine the quantities.');
      seen.add(variantId);
      const qty = Number(raw.qty);
      if (!Number.isInteger(qty) || qty < 1 || qty > 1000000) throw new HttpError(400, 'A quantity is invalid.');
      const unitCost = money(raw.unitCost, 'Unit cost');
      const [[v]] = await conn.query('SELECT v.id, v.product_id, v.label, v.stock, v.cost_price, p.name, p.is_combo FROM product_variants v JOIN products p ON p.id = v.product_id WHERE v.id = ?', [variantId]);
      if (!v) throw new HttpError(400, 'A product no longer exists.');
      if (v.is_combo) throw new HttpError(400, 'Combos cannot be purchased; buy their components.');
      lines.push({ ...v, qty, unitCost, lineTotal: Math.round(unitCost * qty * 100) / 100 });
    }
    const subtotal = Math.round(lines.reduce((s, l) => s + l.lineTotal, 0) * 100) / 100;
    if (discount > subtotal) throw new HttpError(400, 'Discount cannot exceed the subtotal.');
    const total = Math.round((subtotal - discount) * 100) / 100;
    if (paid > total) throw new HttpError(400, 'Paid amount cannot exceed the total.');
    const [created] = await conn.query(
      'INSERT INTO purchases (ref_no, supplier_id, purchase_date, subtotal, discount, total, paid, note, admin_id) VALUES (?,?,?,?,?,?,?,?,?)',
      [`TMP-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, supplierId, date, subtotal, discount, total, paid, text(b.note, 'Note', { max: 500 }), req.adminUser.id]);
    const purchaseId = created.insertId;
    await conn.query('UPDATE purchases SET ref_no = ? WHERE id = ?', [`PUR-${String(purchaseId).padStart(6, '0')}`, purchaseId]);
    for (const l of lines.sort((a, c) => a.id - c.id)) {
      await conn.query('INSERT INTO purchase_items (purchase_id, variant_id, product_id, name, qty, unit_cost, line_total) VALUES (?,?,?,?,?,?,?)',
        [purchaseId, l.id, l.product_id, `${l.name} (${l.label})`, l.qty, l.unitCost, l.lineTotal]);
      const [[lock]] = await conn.query('SELECT stock, cost_price FROM product_variants WHERE id = ? FOR UPDATE', [l.id]);
      const onHand = Math.max(0, Number(lock.stock));
      const cost = onHand > 0 ? (onHand * Number(lock.cost_price) + l.qty * l.unitCost) / (onHand + l.qty) : l.unitCost;
      await moveSimple(conn, { variantId: l.id, change: l.qty, type: 'purchase', refType: 'purchase', refId: purchaseId, unitCost: l.unitCost, adminId: req.adminUser.id, note: supplier.name });
      await conn.query('UPDATE product_variants SET cost_price = ? WHERE id = ?', [Math.round(cost * 100) / 100, l.id]);
    }
    await syncCombos(conn, lines.map((l) => l.id));
    if (paid > 0) {
      await addTransaction(conn, { accountId: intParam(b.accountId, 'account'), kind: 'expense', amount: paid, purposeName: 'Purchase', date,
        note: `Purchase PUR-${String(purchaseId).padStart(6, '0')} (${supplier.name})`, refType: 'purchase', refId: purchaseId, adminId: req.adminUser.id });
    }
    return purchaseId;
  });
  await audit(req.adminUser.id, 'create', 'purchase', id);
  res.status(201).json({ id });
});

const cancelPurchase = route(async (req, res) => {
  const id = intParam(req.params.id);
  await withTx(async (conn) => {
    const [[purchase]] = await conn.query('SELECT * FROM purchases WHERE id = ? FOR UPDATE', [id]);
    if (!purchase) throw new HttpError(404, 'Purchase not found.');
    if (purchase.status === 'cancelled') throw new HttpError(409, 'This purchase is already cancelled.');
    const [items] = await conn.query('SELECT variant_id, qty FROM purchase_items WHERE purchase_id = ? ORDER BY variant_id', [id]);
    for (const i of items) {
      await moveSimple(conn, { variantId: i.variant_id, change: -i.qty, type: 'adjustment', refType: 'purchase', refId: id, adminId: req.adminUser.id, note: `Purchase ${purchase.ref_no} cancelled` });
    }
    await syncCombos(conn, items.map((i) => i.variant_id));
    const [[paidOut]] = await conn.query("SELECT COALESCE(SUM(amount),0) AS amount, MIN(account_id) AS account_id FROM transactions WHERE ref_type = 'purchase' AND ref_id = ?", [id]);
    if (Number(paidOut.amount) > 0) {
      await addTransaction(conn, { accountId: paidOut.account_id, kind: 'income', amount: paidOut.amount, purposeName: 'Purchase refund', note: `Cancelled ${purchase.ref_no}`, refType: 'purchase_refund', refId: id, adminId: req.adminUser.id });
    }
    await conn.query("UPDATE purchases SET status = 'cancelled' WHERE id = ?", [id]);
  });
  res.json({ ok: true });
});

module.exports = { listSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier, paySupplier, listPurchases, getPurchase, createPurchase, cancelPurchase };
