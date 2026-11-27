'use client';
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { del, post, useFetch } from '@/lib/admin-api';
import { taka, fmtDate, todayStr } from '@/lib/format';
import { Alert, Badge, Btn, Card, IconBtn, Input, Modal, PageHeader, Pagination, Select, Stat, Table, Tabs, useConfirm, useToast } from '@/components/admin/ui/kit';
import { AccountSelect, useAccounts } from '@/components/admin/accounts/bits';
import { useAdmin } from '@/components/admin/AdminContext';

function Entry({ kind: initial, onClose, onDone }) {
  const [kind, setKind] = useState(initial);
  const { data: purposes } = useFetch('/ops/purposes', { kind });
  const { data: accs } = useAccounts();
  const [f, setF] = useState({ accountId: '', purposeId: '', amount: '', date: todayStr(), note: '' });
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  useEffect(() => { if (!f.accountId && accs) { const d = accs.items.find((a) => a.is_default && a.is_active) || accs.items.find((a) => a.is_active); if (d) setF((s) => ({ ...s, accountId: String(d.id) })); } }, [accs, f.accountId]);
  useEffect(() => setF((s) => ({ ...s, purposeId: '' })), [kind]);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  async function save() { setBusy(true); setError(''); try { await post('/ops/transactions', { kind, accountId: Number(f.accountId), purposeId: Number(f.purposeId), amount: Number(f.amount), date: f.date, note: f.note || undefined }); onDone(); } catch (e) { setError(e.message); } finally { setBusy(false); } }
  return (
    <Modal title="Add entry" onClose={onClose} width="max-w-md" footer={<><Btn variant="outline" onClick={onClose}>Cancel</Btn><Btn loading={busy} disabled={!f.accountId || !f.purposeId || !(Number(f.amount) > 0)} onClick={save}>Save</Btn></>}>
      <div className="grid gap-4">{error && <Alert>{error}</Alert>}
        <div className="grid grid-cols-2 gap-2">{['income', 'expense'].map((k) => <button key={k} type="button" onClick={() => setKind(k)} className={`rounded-xl py-2.5 text-sm font-bold capitalize ${kind === k ? (k === 'income' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white') : 'bg-taupe-100'}`}>{k}</button>)}</div>
        <AccountSelect value={f.accountId} onChange={(v) => set('accountId', v)} required />
        <Select label="Purpose" required value={f.purposeId} onChange={(e) => set('purposeId', e.target.value)} options={(purposes?.items || []).filter((p) => p.is_active).map((p) => ({ value: String(p.id), label: p.name }))} placeholder="Choose purpose" help="Add more purposes under Accounts → Accounts & purposes." />
        <div className="grid grid-cols-2 gap-3"><Input label="Amount (৳)" required type="number" min="0" step="0.01" value={f.amount} onChange={(e) => set('amount', e.target.value)} /><Input label="Date" type="date" value={f.date} onChange={(e) => set('date', e.target.value)} /></div>
        <Input label="Note" value={f.note} onChange={(e) => set('note', e.target.value)} />
      </div>
    </Modal>
  );
}

function Inner() {
  const sp = useSearchParams(); const { can } = useAdmin(); const toast = useToast(); const [ask, node] = useConfirm();
  const [kind, setKind] = useState(sp.get('kind') || 'all'); const [page, setPage] = useState(1); const [accountId, setAccountId] = useState(''); const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [entry, setEntry] = useState(sp.get('new') || null);
  const { data: accs } = useAccounts();
  const { data, error, loading, reload } = useFetch('/ops/transactions', { kind, page, account_id: accountId || undefined, from: from || undefined, to: to || undefined });
  const manage = can('accounts.manage');
  return (
    <>
      <PageHeader title="Income & expense" subtitle="Every taka in and out. Sales, purchases and salaries post here automatically." actions={manage && <><Btn variant="soft" icon="arrowDown" onClick={() => setEntry('income')}>Add income</Btn><Btn icon="arrowUp" onClick={() => setEntry('expense')}>Add expense</Btn></>} />
      <div className="mb-4 grid gap-4 sm:grid-cols-2"><Stat label="Income (filtered)" value={taka(data?.totalIncome || 0)} icon="arrowDown" tone="green" /><Stat label="Expense (filtered)" value={taka(data?.totalExpense || 0)} icon="arrowUp" tone="red" /></div>
      <Tabs className="mb-3" value={kind} onChange={(v) => { setKind(v); setPage(1); }} tabs={[{ value: 'all', label: 'All' }, { value: 'income', label: 'Income' }, { value: 'expense', label: 'Expense' }, { value: 'transfer_in', label: 'Transfers in' }, { value: 'transfer_out', label: 'Transfers out' }]} />
      <div className="mb-3 flex flex-wrap items-center gap-3"><select aria-label="Account" value={accountId} onChange={(e) => { setAccountId(e.target.value); setPage(1); }} className="rounded-full bg-white px-4 py-2 text-sm shadow-card"><option value="">All accounts</option>{(accs?.items || []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
        <input type="date" aria-label="From" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-full bg-white px-3 py-1.5 text-sm shadow-card" /><input type="date" aria-label="To" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-full bg-white px-3 py-1.5 text-sm shadow-card" /></div>
      {error && <Alert>{error}</Alert>}
      <Card pad={false}><div className="px-2 pb-2"><Table loading={loading} rows={data?.items} empty="No entries." columns={[
        { label: 'Date', render: (t) => fmtDate(t.txn_date) },
        { label: 'Type', render: (t) => <Badge tone={t.kind === 'income' || t.kind === 'transfer_in' ? 'green' : 'red'}>{t.kind.replace('_', ' ')}</Badge> },
        { label: 'Purpose', render: (t) => t.purpose || '—' }, { label: 'Account', key: 'account' },
        { label: 'Note', render: (t) => <span className="text-xs text-taupe-600">{t.note}</span> },
        { label: 'Amount', align: 'right', render: (t) => <b className={t.kind === 'income' || t.kind === 'transfer_in' ? 'text-emerald-700' : 'text-red-700'}>{t.kind === 'income' || t.kind === 'transfer_in' ? '+' : '−'}{taka(t.amount)}</b> },
        { label: 'By', key: 'admin' },
        { label: '', align: 'right', render: (t) => manage && !t.ref_type && <IconBtn icon="trash" label="Delete entry" onClick={async () => { if (!(await ask({ title: 'Delete this entry?', message: 'The account balance will change.', confirmLabel: 'Delete' }))) return; try { await del(`/ops/transactions/${t.id}`); toast('Entry deleted'); reload(); } catch (e) { toast(e.message, 'error'); } }} /> },
      ]} />{data && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} label="entries" />}</div></Card>
      {entry && <Entry kind={entry === 'income' ? 'income' : 'expense'} onClose={() => setEntry(null)} onDone={() => { setEntry(null); toast('Entry saved'); reload(); }} />}
      {node}
    </>
  );
}
export default function Page() { return <Suspense><Inner /></Suspense>; }
