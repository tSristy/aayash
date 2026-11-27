'use client';
import { useState } from 'react';
import { post, useFetch } from '@/lib/admin-api';
import { taka, fmtDate, todayStr } from '@/lib/format';
import { Alert, Btn, Card, Input, Modal, PageHeader, Pagination, Table, useToast } from '@/components/admin/ui/kit';
import { AccountSelect } from '@/components/admin/accounts/bits';
import { useAdmin } from '@/components/admin/AdminContext';

export default function Transfers() {
  const { can } = useAdmin(); const toast = useToast();
  const [page, setPage] = useState(1); const { data, error, loading, reload } = useFetch('/ops/transfers', { page });
  const [open, setOpen] = useState(false); const [f, setF] = useState({ from: '', to: '', amount: '', date: todayStr(), note: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  async function save() { setBusy(true); setErr(''); try { await post('/ops/transfers', { fromAccountId: Number(f.from), toAccountId: Number(f.to), amount: Number(f.amount), date: f.date, note: f.note || undefined }); toast('Transfer saved'); setOpen(false); setF({ from: '', to: '', amount: '', date: todayStr(), note: '' }); reload(); } catch (e) { setErr(e.message); } finally { setBusy(false); } }
  return (
    <>
      <PageHeader title="Fund transfers" subtitle="Move money between cash, bank and mobile wallets." actions={can('accounts.manage') && <Btn icon="transfer" onClick={() => setOpen(true)}>New transfer</Btn>} />
      {error && <Alert>{error}</Alert>}
      <Card pad={false}><div className="px-2 pb-2"><Table loading={loading} rows={data?.items} empty="No transfers yet." columns={[
        { label: 'Date', render: (t) => fmtDate(t.transfer_date) }, { label: 'From', key: 'from_account' }, { label: 'To', key: 'to_account' }, { label: 'Amount', align: 'right', render: (t) => <b>{taka(t.amount)}</b> }, { label: 'Note', key: 'note' },
      ]} />{data && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} label="transfers" />}</div></Card>
      {open && <Modal title="New transfer" onClose={() => setOpen(false)} width="max-w-md" footer={<><Btn variant="outline" onClick={() => setOpen(false)}>Cancel</Btn><Btn loading={busy} disabled={!f.from || !f.to || !(Number(f.amount) > 0)} onClick={save}>Transfer</Btn></>}>
        <div className="grid gap-4">{err && <Alert>{err}</Alert>}<AccountSelect label="From" value={f.from} onChange={(v) => set('from', v)} required /><AccountSelect label="To" value={f.to} onChange={(v) => set('to', v)} required showBalance={false} />
          <div className="grid grid-cols-2 gap-3"><Input label="Amount (৳)" type="number" min="0" step="0.01" value={f.amount} onChange={(e) => set('amount', e.target.value)} /><Input label="Date" type="date" value={f.date} onChange={(e) => set('date', e.target.value)} /></div><Input label="Note" value={f.note} onChange={(e) => set('note', e.target.value)} /></div></Modal>}
    </>
  );
}
