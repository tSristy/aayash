'use strict';

const { HttpError } = require('../../lib/http');

async function purposeId(conn, name, kind) {
  await conn.query('INSERT IGNORE INTO account_purposes (name, kind, is_system) VALUES (?, ?, 1)', [name, kind]);
  const [[row]] = await conn.query('SELECT id FROM account_purposes WHERE name = ? AND kind = ?', [name, kind]);
  return row.id;
}

async function defaultAccountId(conn) {
  const [[setting]] = await conn.query("SELECT setting_value FROM site_settings WHERE setting_key = 'default_sales_account_id'");
  const configured = Number(setting?.setting_value);
  if (configured) {
    const [[ok]] = await conn.query('SELECT id FROM accounts WHERE id = ? AND is_active = 1', [configured]);
    if (ok) return ok.id;
  }
  const [[fallback]] = await conn.query('SELECT id FROM accounts WHERE is_active = 1 ORDER BY is_default DESC, id LIMIT 1');
  return fallback?.id || null;
}

/** Insert one ledger row. kind: income | expense | transfer_in | transfer_out */
async function addTransaction(conn, { accountId, kind, amount, purposeName, purposeIdValue, date, note, refType, refId, adminId }) {
  const value = Math.round(Number(amount) * 100) / 100;
  if (!(value > 0)) return null;
  const [[account]] = await conn.query('SELECT id FROM accounts WHERE id = ? AND is_active = 1', [accountId]);
  if (!account) throw new HttpError(400, 'Choose a valid active account.');
  let purpose = purposeIdValue || null;
  if (!purpose && purposeName) purpose = await purposeId(conn, purposeName, kind.startsWith('income') ? 'income' : 'expense');
  const [result] = await conn.query(`
    INSERT INTO transactions (account_id, kind, purpose_id, amount, txn_date, note, ref_type, ref_id, admin_id)
    VALUES (?, ?, ?, ?, COALESCE(?, CURDATE()), ?, ?, ?, ?)`,
  [accountId, kind, purpose, value, date || null, note || null, refType || null, refId || null, adminId || null]);
  return result.insertId;
}

/** Balance of each account: opening + inflow - outflow. */
async function balances(conn) {
  const [rows] = await conn.query(`
    SELECT a.id, a.name, a.type, a.is_default, a.is_active, a.opening_balance,
      a.opening_balance + COALESCE(SUM(CASE WHEN t.kind IN ('income','transfer_in') THEN t.amount
                                            WHEN t.kind IN ('expense','transfer_out') THEN -t.amount END), 0) AS balance
    FROM accounts a LEFT JOIN transactions t ON t.account_id = a.id
    GROUP BY a.id ORDER BY a.is_default DESC, a.id`);
  return rows.map((r) => ({ ...r, opening_balance: Number(r.opening_balance), balance: Number(r.balance) }));
}

module.exports = { addTransaction, balances, purposeId, defaultAccountId };
