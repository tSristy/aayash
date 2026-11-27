'use client';
import { useState } from 'react';
import { post, useFetch } from '@/lib/admin-api';
import { taka, fmtDateTime } from '@/lib/format';
import { Alert, Btn, Card, Input, Modal, PageHeader, Pagination, Stat, Table, useToast } from '@/components/admin/ui/kit';
import VariantPicker from '@/components/admin/orders/VariantPicker';
import { useAdmin } from '@/components/admin/AdminContext';

export default function Damage() {
  const { can } = useAdmin(); const toast = useToast();
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useFetch('/ops/damages', { page });
  const [open, setOpen] = useState(false); const [v, setV] = useState(null); const [qty, setQty] = useState('1'); const [reason, setReason] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  async function save() { setBusy(true); setErr(''); try { await post('/ops/damages', { variantId: v.id, qty: Number(qty), reason }); toast('Damage recorded'); setOpen(false); setV(null); setReason(''); setQty('1'); reload(); } catch (e) { setErr(e.message); } finally { setBusy(false); } }
  return (
    <>
      <PageHeader title="Damage & loss" subtitle="Spoiled, expired or broken stock. It leaves the shelf and counts as a loss in Profit & Loss (not a cash expense)." actions={can('stock.manage') && <Btn icon="plus" onClick={() => setOpen(true)}>Record damage</Btn>} />
      <div className="mb-4 grid gap-4 sm:grid-cols-2"><Stat label="Total written off (at cost)" value={taka(data?.totalLoss || 0)} icon="alert" tone="red" /></div>
      {error && <Alert>{error}</Alert>}
      <Card pad={false}><div className="px-2 pb-2"><Table loading={loading} rows={data?.items} empty="No damage recorded." columns={[
        { label: 'Date', render: (r) => fmtDateTime(r.created_at) }, { label: 'Product', render: (r) => <><p className="font-medium">{r.name}</p><p className="text-xs text-taupe-600">{r.label} · {r.sku}</p></> },
        { label: 'Qty', align: 'right', key: 'qty' }, { label: 'Loss', align: 'right', render: (r) => <b>{taka(r.loss)}</b> }, { label: 'Reason', key: 'reason' }, { label: 'By', key: 'admin' },
      ]} />{data && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} label="records" />}</div></Card>
      {open && <Modal title="Record damage" onClose={() => setOpen(false)} width="max-w-md" footer={<><Btn variant="outline" onClick={() => setOpen(false)}>Cancel</Btn><Btn loading={busy} disabled={!v || !reason.trim() || Number(qty) < 1} onClick={save}>Record</Btn></>}>
        <div className="grid gap-4">{err && <Alert>{err}</Alert>}
          {v ? <div className="flex items-center justify-between rounded-xl bg-taupe-50 p-3 text-sm"><span><b>{v.name}</b> · {v.label} · {v.stock} in stock</span><button className="text-xs text-primary-deep" onClick={() => setV(null)}>Change</button></div> : <VariantPicker sellable={false} excludeCombos onPick={setV} clearOnPick />}
          <Input label="Quantity" type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} /><Input label="Reason" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Expired, broken seal, water damage…" /></div></Modal>}
    </>
  );
}
