'use strict';

const { pool } = require('../../../db');
const { HttpError, route, withTx, intParam, money, text, dateOnly, today, paging, pageResult, audit } = require('../../lib/http');
const { addTransaction, balances } = require('../../services/accounts/ledger');

const overview = route(async (_req, res) => {
  const list = await balances(pool);
  const [[month]] = await pool.query(`
    SELECT COALESCE(SUM(CASE WHEN kind='income' THEN amount END),0) AS income, COALESCE(SUM(CASE WHEN kind='expense' THEN amount END),0) AS expense
    FROM transactions WHERE txn_date >= DATE_FORMAT(CURDATE(), '%Y-%m-01')`);
  const [[dues]] = await pool.query(`
    SELECT COALESCE(SUM(CASE WHEN direction='receivable' THEN amount - paid END),0) AS receivable,
           COALESCE(SUM(CASE WHEN direction='payable' THEN amount - paid END),0) AS payable FROM due_records WHERE status = 'open'`);
  const [[sup]] = await pool.query("SELECT COALESCE(SUM(total - paid),0) AS d FROM purchases WHERE status = 'received'");
  const [[opening]] = await pool.query('SELECT COALESCE(SUM(opening_due),0) AS d FROM suppliers');
  const [[bills]] = await pool.query("SELECT COALESCE(SUM(amount),0) AS d, COUNT(*) AS n FROM bills WHERE status = 'unpaid'");
  res.json({
    accounts: list, totalBalance: list.filter((a) => a.is_active).reduce((s, a) => s + a.balance, 0),
    monthIncome: Number(month.income), monthExpense: Number(month.expense),
    receivable: Number(dues.receivable), payable: Number(dues.payable), supplierDue: Number(sup.d) + Number(opening.d),
    unpaidBills: Number(bills.d), unpaidBillCount: Number(bills.n),
  });
});

// ---------------------------------------------------------------- accounts
const isOff = (v) => v === false || v === 0 || v === '0' || v === 'false';
const accountInput = (b) => ({
  name: text(b.name, 'Name', { max: 120, required: true }),
  type: ['cash', 'bank', 'mobile'].includes(b.type) ? b.type : 'cash',
  opening_balance: money(b.opening_balance ?? 0, 'Opening balance', { min: -1e9 }),
  is_active: b.is_active === undefined ? 1 : (isOff(b.is_active) ? 0 : 1),
});
const makeDefault = async (conn, id) => { await conn.query('UPDATE accounts SET is_default = (id = ?)', [id]); };

const listAccounts = route(async (_req, res) => res.json({ items: await balances(pool) }));
const createAccount = route(async (req, res) => {
  const d = accountInput(req.body || {});
  const id = await withTx(async (conn) => {
    const [r] = await conn.query('INSERT INTO accounts (name, type, opening_balance, is_active) VALUES (?,?,?,?)', [d.name, d.type, d.opening_balance, d.is_active]);
    if (req.body?.is_default) await makeDefault(conn, r.insertId);
    return r.insertId;
  });
  res.status(201).json({ id });
});
const updateAccount = route(async (req, res) => {
  const id = intParam(req.params.id);
  const d = accountInput(req.body || {});
  await withTx(async (conn) => {
    const [r] = await conn.query('UPDATE accounts SET name=?, type=?, opening_balance=?, is_active=? WHERE id=?', [d.name, d.type, d.opening_balance, d.is_active, id]);
    if (!r.affectedRows) throw new HttpError(404, 'Account not found.');
    if (req.body?.is_default) await makeDefault(conn, id);
  });
  res.json({ ok: true });
});
const deleteAccount = route(async (req, res) => {
  const id = intParam(req.params.id);
  const [[used]] = await pool.query('SELECT COUNT(*) AS n FROM transactions WHERE account_id = ?', [id]);
  if (Number(used.n)) throw new HttpError(409, 'This account has transactions. Mark it inactive instead.');
  const [[acc]] = await pool.query('SELECT is_default FROM accounts WHERE id = ?', [id]);
  if (acc?.is_default) throw new HttpError(409, 'Choose another default account before deleting this one.');
  await pool.query('DELETE FROM accounts WHERE id = ?', [id]);
  res.json({ ok: true });
});

// ---------------------------------------------------------------- purposes
const listPurposes = route(async (req, res) => {
  const kind = ['income', 'expense'].includes(req.query.kind) ? req.query.kind : null;
  const [rows] = await pool.query(`SELECT * FROM account_purposes ${kind ? 'WHERE kind = ?' : ''} ORDER BY kind, name`, kind ? [kind] : []);
  res.json({ items: rows });
});
const createPurpose = route(async (req, res) => {
  const name = text(req.body?.name, 'Name', { max: 120, required: true });
  const kind = ['income', 'expense'].includes(req.body?.kind) ? req.body.kind : null;
  if (!kind) throw new HttpError(400, 'Choose income or expense.');
  const [r] = await pool.query('INSERT INTO account_purposes (name, kind) VALUES (?, ?)', [name, kind]);
  res.status(201).json({ id: r.insertId });
});
const updatePurpose = route(async (req, res) => {
  const id = intParam(req.params.id);
  const name = text(req.body?.name, 'Name', { max: 120, required: true });
  const [r] = await pool.query('UPDATE account_purposes SET name = ?, is_active = ? WHERE id = ? AND is_system = 0', [name, isOff(req.body?.is_active) ? 0 : 1, id]);
  if (!r.affectedRows) throw new HttpError(409, 'System purposes cannot be renamed.');
  res.json({ ok: true });
});
const deletePurpose = route(async (req, res) => {
  const [r] = await pool.query('DELETE FROM account_purposes WHERE id = ? AND is_system = 0', [intParam(req.params.id)]);
  if (!r.affectedRows) throw new HttpError(409, 'System purposes cannot be deleted.');
  res.json({ ok: true });
});

// ------------------------------------------------------------ transactions
const listTransactions = route(async (req, res) => {
  const list = paging(req.query, { defaultLimit: 25 });
  const where = [];
  const params = [];
  if (['income', 'expense', 'transfer_in', 'transfer_out'].includes(req.query.kind)) { where.push('t.kind = ?'); params.push(req.query.kind); }
  if (req.query.account_id) { where.push('t.account_id = ?'); params.push(intParam(req.query.account_id)); }
  if (req.query.purpose_id) { where.push('t.purpose_id = ?'); params.push(intParam(req.query.purpose_id)); }
  const from = dateOnly(req.query.from, 'From date', { required: false });
  const to = dateOnly(req.query.to, 'To date', { required: false });
  if (from) { where.push('t.txn_date >= ?'); params.push(from); }
  if (to) { where.push('t.txn_date <= ?'); params.push(to); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [[count]] = await pool.query(`SELECT COUNT(*) AS n,
      COALESCE(SUM(CASE WHEN t.kind='income' THEN t.amount END),0) AS income, COALESCE(SUM(CASE WHEN t.kind='expense' THEN t.amount END),0) AS expense
      FROM transactions t ${clause}`, params);
  const [rows] = await pool.query(`
    SELECT t.id, t.kind, t.amount, t.txn_date, t.note, t.ref_type, t.ref_id, a.name AS account, p.name AS purpose, u.username AS admin
    FROM transactions t JOIN accounts a ON a.id = t.account_id LEFT JOIN account_purposes p ON p.id = t.purpose_id LEFT JOIN admin_users u ON u.id = t.admin_id
    ${clause} ORDER BY t.txn_date DESC, t.id DESC LIMIT ? OFFSET ?`, [...params, list.limit, list.offset]);
  res.json({ ...pageResult(rows.map((r) => ({ ...r, amount: Number(r.amount) })), Number(count.n), list), totalIncome: Number(count.income), totalExpense: Number(count.expense) });
});

const createTransaction = route(async (req, res) => {
  const b = req.body || {};
  const kind = b.kind === 'income' ? 'income' : b.kind === 'expense' ? 'expense' : null;
  if (!kind) throw new HttpError(400, 'Choose income or expense.');
  const purposeId = intParam(b.purposeId, 'purpose');
  const [[purpose]] = await pool.query('SELECT kind FROM account_purposes WHERE id = ? AND is_active = 1', [purposeId]);
  if (!purpose || purpose.kind !== kind) throw new HttpError(400, `Choose a valid ${kind} purpose.`);
  if (kind === 'expense') {
    const [acc] = (await balances(pool)).filter((a) => a.id === Number(b.accountId));
    if (acc && acc.balance < Number(b.amount)) throw new HttpError(400, `Insufficient balance in ${acc.name} (৳${acc.balance.toFixed(2)}).`);
  }
  const id = await withTx((conn) => addTransaction(conn, {
    accountId: intParam(b.accountId, 'account'), kind, amount: money(b.amount, 'Amount', { allowZero: false }), purposeIdValue: purposeId,
    date: b.date ? dateOnly(b.date) : null, note: text(b.note, 'Note', { max: 500 }), adminId: req.adminUser.id,
  }));
  res.status(201).json({ id });
});

const deleteTransaction = route(async (req, res) => {
  const [r] = await pool.query('DELETE FROM transactions WHERE id = ? AND ref_type IS NULL', [intParam(req.params.id)]);
  if (!r.affectedRows) throw new HttpError(409, 'Only manual entries can be deleted. Automatic entries follow their order, purchase or salary record.');
  await audit(req.adminUser.id, 'delete', 'transaction', req.params.id);
  res.json({ ok: true });
});

// --------------------------------------------------------------- transfers
const listTransfers = route(async (req, res) => {
  const list = paging(req.query);
  const [[count]] = await pool.query('SELECT COUNT(*) AS n FROM fund_transfers');
  const [rows] = await pool.query(`
    SELECT f.id, f.amount, f.transfer_date, f.note, a.name AS from_account, b.name AS to_account
    FROM fund_transfers f JOIN accounts a ON a.id = f.from_account_id JOIN accounts b ON b.id = f.to_account_id
    ORDER BY f.id DESC LIMIT ? OFFSET ?`, [list.limit, list.offset]);
  res.json(pageResult(rows.map((r) => ({ ...r, amount: Number(r.amount) })), Number(count.n), list));
});

const createTransfer = route(async (req, res) => {
  const b = req.body || {};
  const from = intParam(b.fromAccountId, 'source account');
  const to = intParam(b.toAccountId, 'destination account');
  if (from === to) throw new HttpError(400, 'Choose two different accounts.');
  const amount = money(b.amount, 'Amount', { allowZero: false });
  const date = b.date ? dateOnly(b.date) : today();
  const id = await withTx(async (conn) => {
    const [[src]] = await conn.query('SELECT id FROM accounts WHERE id = ? AND is_active = 1 FOR UPDATE', [from]);
    if (!src) throw new HttpError(400, 'Choose a valid active source account.');
    const current = (await balances(conn)).find((a) => a.id === from);
    if (current.balance < amount) throw new HttpError(400, `Insufficient balance in ${current.name} (৳${current.balance.toFixed(2)}).`);
    const [r] = await conn.query('INSERT INTO fund_transfers (from_account_id, to_account_id, amount, transfer_date, note, admin_id) VALUES (?,?,?,?,?,?)',
      [from, to, amount, date, text(b.note, 'Note', { max: 500 }), req.adminUser.id]);
    await addTransaction(conn, { accountId: from, kind: 'transfer_out', amount, date, note: 'Fund transfer out', refType: 'transfer', refId: r.insertId, adminId: req.adminUser.id });
    await addTransaction(conn, { accountId: to, kind: 'transfer_in', amount, date, note: 'Fund transfer in', refType: 'transfer', refId: r.insertId, adminId: req.adminUser.id });
    return r.insertId;
  });
  res.status(201).json({ id });
});

// -------------------------------------------------------------------- dues
const listDues = route(async (req, res) => {
  const where = [];
  const params = [];
  if (['receivable', 'payable'].includes(req.query.direction)) { where.push('direction = ?'); params.push(req.query.direction); }
  if (['open', 'settled'].includes(req.query.status)) { where.push('status = ?'); params.push(req.query.status); }
  const [rows] = await pool.query(`SELECT * FROM due_records ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY status, due_date IS NULL, due_date, id DESC LIMIT 500`, params);
  res.json({ items: rows.map((r) => ({ ...r, amount: Number(r.amount), paid: Number(r.paid), remaining: Number(r.amount) - Number(r.paid) })) });
});
const dueInput = (b) => ({
  direction: ['receivable', 'payable'].includes(b.direction) ? b.direction : (() => { throw new HttpError(400, 'Choose receivable or payable.'); })(),
  party_name: text(b.party_name, 'Party name', { max: 160, required: true }), party_phone: text(b.party_phone, 'Phone', { max: 30 }),
  amount: money(b.amount, 'Amount', { allowZero: false }), due_date: dateOnly(b.due_date, 'Due date', { required: false }), note: text(b.note, 'Note', { max: 500 }),
});
const createDue = route(async (req, res) => {
  const d = dueInput(req.body || {});
  const [r] = await pool.query('INSERT INTO due_records (direction, party_name, party_phone, amount, due_date, note) VALUES (?,?,?,?,?,?)', [d.direction, d.party_name, d.party_phone, d.amount, d.due_date, d.note]);
  res.status(201).json({ id: r.insertId });
});
const updateDue = route(async (req, res) => {
  const d = dueInput(req.body || {});
  const [r] = await pool.query('UPDATE due_records SET party_name=?, party_phone=?, amount=GREATEST(?, paid), due_date=?, note=? WHERE id=?', [d.party_name, d.party_phone, d.amount, d.due_date, d.note, intParam(req.params.id)]);
  if (!r.affectedRows) throw new HttpError(404, 'Due not found.');
  res.json({ ok: true });
});
const deleteDue = route(async (req, res) => {
  const [[d]] = await pool.query('SELECT paid FROM due_records WHERE id = ?', [intParam(req.params.id)]);
  if (d && Number(d.paid) > 0) throw new HttpError(409, 'Payments were already recorded against this due.');
  await pool.query('DELETE FROM due_records WHERE id = ?', [intParam(req.params.id)]);
  res.json({ ok: true });
});
const payDue = route(async (req, res) => {
  const id = intParam(req.params.id);
  const amount = money(req.body?.amount, 'Amount', { allowZero: false });
  await withTx(async (conn) => {
    const [[due]] = await conn.query('SELECT * FROM due_records WHERE id = ? FOR UPDATE', [id]);
    if (!due) throw new HttpError(404, 'Due not found.');
    const remaining = Number(due.amount) - Number(due.paid);
    if (amount > remaining + 0.001) throw new HttpError(400, `Amount exceeds what is remaining (৳${remaining.toFixed(2)}).`);
    const received = due.direction === 'receivable';
    if (!received) {
      const acc = (await balances(conn)).find((a) => a.id === Number(req.body?.accountId));
      if (acc && acc.balance < amount) throw new HttpError(400, `Insufficient balance in ${acc.name}.`);
    }
    await addTransaction(conn, {
      accountId: intParam(req.body?.accountId, 'account'), kind: received ? 'income' : 'expense', amount,
      purposeName: received ? 'Other income' : 'Other expense', date: req.body?.date ? dateOnly(req.body.date) : null,
      note: `${received ? 'Received from' : 'Paid to'} ${due.party_name}`, refType: 'due', refId: id, adminId: req.adminUser.id,
    });
    const paid = Number(due.paid) + amount;
    await conn.query('UPDATE due_records SET paid = ?, status = ? WHERE id = ?', [paid, paid >= Number(due.amount) - 0.001 ? 'settled' : 'open', id]);
  });
  res.json({ ok: true });
});

// ------------------------------------------------------- employees, salary
const listEmployees = route(async (_req, res) => {
  const [rows] = await pool.query('SELECT * FROM employees ORDER BY is_active DESC, name');
  res.json({ items: rows.map((r) => ({ ...r, monthly_salary: Number(r.monthly_salary) })) });
});
const empInput = (b) => ({
  name: text(b.name, 'Name', { max: 160, required: true }), phone: text(b.phone, 'Phone', { max: 30 }), designation: text(b.designation, 'Designation', { max: 120 }),
  monthly_salary: money(b.monthly_salary ?? 0, 'Monthly salary'), joined_on: dateOnly(b.joined_on, 'Joining date', { required: false }), is_active: isOff(b.is_active) ? 0 : 1,
});
const createEmployee = route(async (req, res) => {
  const d = empInput(req.body || {});
  const [r] = await pool.query('INSERT INTO employees (name, phone, designation, monthly_salary, joined_on, is_active) VALUES (?,?,?,?,?,?)', [d.name, d.phone, d.designation, d.monthly_salary, d.joined_on, d.is_active]);
  res.status(201).json({ id: r.insertId });
});
const updateEmployee = route(async (req, res) => {
  const d = empInput(req.body || {});
  const [r] = await pool.query('UPDATE employees SET name=?, phone=?, designation=?, monthly_salary=?, joined_on=?, is_active=? WHERE id=?', [d.name, d.phone, d.designation, d.monthly_salary, d.joined_on, d.is_active, intParam(req.params.id)]);
  if (!r.affectedRows) throw new HttpError(404, 'Employee not found.');
  res.json({ ok: true });
});
const listSalary = route(async (req, res) => {
  const month = /^\d{4}-\d{2}$/.test(String(req.query.month || '')) ? req.query.month : today().slice(0, 7);
  const [rows] = await pool.query(`
    SELECT e.id AS employee_id, e.name, e.designation, e.monthly_salary, e.is_active,
           COALESCE((SELECT SUM(s.amount) FROM salary_payments s WHERE s.employee_id = e.id AND s.salary_month = ?), 0) AS paid
    FROM employees e WHERE e.is_active = 1 OR EXISTS (SELECT 1 FROM salary_payments s WHERE s.employee_id = e.id AND s.salary_month = ?) ORDER BY e.name`, [month, month]);
  const [payments] = await pool.query(`
    SELECT s.id, s.employee_id, s.amount, s.paid_on, s.note, a.name AS account FROM salary_payments s JOIN accounts a ON a.id = s.account_id
    WHERE s.salary_month = ? ORDER BY s.id DESC`, [month]);
  res.json({ month, items: rows.map((r) => ({ ...r, monthly_salary: Number(r.monthly_salary), paid: Number(r.paid), remaining: Math.max(0, Number(r.monthly_salary) - Number(r.paid)) })), payments: payments.map((p) => ({ ...p, amount: Number(p.amount) })) });
});
const paySalary = route(async (req, res) => {
  const b = req.body || {};
  const employeeId = intParam(b.employeeId, 'employee');
  const month = /^\d{4}-\d{2}$/.test(String(b.month || '')) ? b.month : null;
  if (!month) throw new HttpError(400, 'Choose a valid salary month.');
  const amount = money(b.amount, 'Amount', { allowZero: false });
  const date = b.date ? dateOnly(b.date) : today();
  await withTx(async (conn) => {
    const [[emp]] = await conn.query('SELECT * FROM employees WHERE id = ? FOR UPDATE', [employeeId]);
    if (!emp) throw new HttpError(404, 'Employee not found.');
    const accountId = intParam(b.accountId, 'account');
    const acc = (await balances(conn)).find((a) => a.id === accountId);
    if (acc && acc.balance < amount) throw new HttpError(400, `Insufficient balance in ${acc.name} (৳${acc.balance.toFixed(2)}).`);
    const [r] = await conn.query('INSERT INTO salary_payments (employee_id, salary_month, amount, account_id, paid_on, note, admin_id) VALUES (?,?,?,?,?,?,?)',
      [employeeId, month, amount, accountId, date, text(b.note, 'Note', { max: 255 }), req.adminUser.id]);
    await addTransaction(conn, { accountId, kind: 'expense', amount, purposeName: 'Salary', date, note: `Salary ${month} – ${emp.name}`, refType: 'salary', refId: r.insertId, adminId: req.adminUser.id });
  });
  res.status(201).json({ ok: true });
});

// ------------------------------------------------------------------- bills
const listBills = route(async (req, res) => {
  const status = ['paid', 'unpaid'].includes(req.query.status) ? req.query.status : null;
  const [rows] = await pool.query(`
    SELECT b.*, p.name AS purpose, a.name AS account, (b.status = 'unpaid' AND b.due_date IS NOT NULL AND b.due_date < CURDATE()) AS overdue
    FROM bills b LEFT JOIN account_purposes p ON p.id = b.purpose_id LEFT JOIN accounts a ON a.id = b.account_id
    ${status ? 'WHERE b.status = ?' : ''} ORDER BY b.status, b.due_date IS NULL, b.due_date, b.id DESC LIMIT 500`, status ? [status] : []);
  res.json({ items: rows.map((r) => ({ ...r, amount: Number(r.amount), overdue: Boolean(r.overdue) })) });
});
const billInput = (b) => ({
  title: text(b.title, 'Title', { max: 160, required: true }), purpose_id: b.purpose_id ? intParam(b.purpose_id, 'purpose') : null,
  amount: money(b.amount, 'Amount', { allowZero: false }), due_date: dateOnly(b.due_date, 'Due date', { required: false }), note: text(b.note, 'Note', { max: 500 }),
});
const createBill = route(async (req, res) => {
  const d = billInput(req.body || {});
  const [r] = await pool.query('INSERT INTO bills (title, purpose_id, amount, due_date, note) VALUES (?,?,?,?,?)', [d.title, d.purpose_id, d.amount, d.due_date, d.note]);
  res.status(201).json({ id: r.insertId });
});
const updateBill = route(async (req, res) => {
  const d = billInput(req.body || {});
  const [r] = await pool.query("UPDATE bills SET title=?, purpose_id=?, amount=?, due_date=?, note=? WHERE id=? AND status = 'unpaid'", [d.title, d.purpose_id, d.amount, d.due_date, d.note, intParam(req.params.id)]);
  if (!r.affectedRows) throw new HttpError(409, 'Paid bills cannot be edited.');
  res.json({ ok: true });
});
const deleteBill = route(async (req, res) => {
  const [r] = await pool.query("DELETE FROM bills WHERE id = ? AND status = 'unpaid'", [intParam(req.params.id)]);
  if (!r.affectedRows) throw new HttpError(409, 'Paid bills cannot be deleted.');
  res.json({ ok: true });
});
const payBill = route(async (req, res) => {
  const id = intParam(req.params.id);
  await withTx(async (conn) => {
    const [[bill]] = await conn.query('SELECT * FROM bills WHERE id = ? FOR UPDATE', [id]);
    if (!bill) throw new HttpError(404, 'Bill not found.');
    if (bill.status === 'paid') throw new HttpError(409, 'This bill is already paid.');
    const accountId = intParam(req.body?.accountId, 'account');
    const acc = (await balances(conn)).find((a) => a.id === accountId);
    if (acc && acc.balance < Number(bill.amount)) throw new HttpError(400, `Insufficient balance in ${acc.name} (৳${acc.balance.toFixed(2)}).`);
    const date = req.body?.date ? dateOnly(req.body.date) : today();
    await addTransaction(conn, { accountId, kind: 'expense', amount: bill.amount, purposeIdValue: bill.purpose_id, purposeName: bill.purpose_id ? null : 'Other expense', date, note: `Bill: ${bill.title}`, refType: 'bill', refId: id, adminId: req.adminUser.id });
    await conn.query("UPDATE bills SET status = 'paid', paid_on = ?, account_id = ? WHERE id = ?", [date, accountId, id]);
  });
  res.json({ ok: true });
});

module.exports = {
  overview, listAccounts, createAccount, updateAccount, deleteAccount, listPurposes, createPurpose, updatePurpose, deletePurpose,
  listTransactions, createTransaction, deleteTransaction, listTransfers, createTransfer,
  listDues, createDue, updateDue, deleteDue, payDue, listEmployees, createEmployee, updateEmployee, listSalary, paySalary,
  listBills, createBill, updateBill, deleteBill, payBill,
};
