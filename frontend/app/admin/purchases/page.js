'use client';
import Link from 'next/link';
import { useState } from 'react';
import { post, useDebounced, useFetch } from '@/lib/admin-api';
import { taka, fmtDate } from '@/lib/format';
import { Alert, Badge, Btn, Card, Drawer, PageHeader, Pagination, SearchBox, Spinner, Table, Tabs, useConfirm, useToast } from '@/components/admin/ui/kit';
import { useAdmin } from '@/components/admin/AdminContext';

function Detail({ id, onClose, onChanged }) {
  const { can } = useAdmin(); const toast = useToast(); const [ask, node] = useConfirm();
  const { data, error } = useFetch(`/ops/purchases/${id}`);
  return (
    <Drawer title={data ? `${data.ref_no} · ${data.supplier}` : 'Purchase'} onClose={onClose} width="max-w-xl">
      {error && <Alert>{error}</Alert>}{!data ? <Spinner /> : (
        <div className="grid gap-4">
          <Card><div className="flex items-center justify-between"><div><p className="text-sm text-taupe-600">{fmtDate(data.purchase_date)}</p>{data.note && <p className="text-sm">{data.note}</p>}</div><Badge tone={data.status === 'received' ? 'green' : 'red'}>{data.status}</Badge></div></Card>
          <Card pad={false}><table className="w-full text-sm"><tbody>{data.items.map((i) => <tr key={i.id} className="border-b border-taupe-50 last:border-0"><td className="px-4 py-3"><p className="font-medium">{i.name}</p><p className="text-xs text-taupe-600">{i.sku}</p></td><td className="px-2 text-right text-taupe-600">{taka(i.unit_cost)} × {i.qty}</td><td className="px-4 text-right font-bold">{taka(i.line_total)}</td></tr>)}</tbody></table></Card>
          <Card><dl className="grid gap-1.5 text-sm"><div className="flex justify-between"><dt>Subtotal</dt><dd>{taka(data.subtotal)}</dd></div><div className="flex justify-between"><dt>Discount</dt><dd>− {taka(data.discount)}</dd></div><div className="flex justify-between font-bold"><dt>Total</dt><dd>{taka(data.total)}</dd></div><div className="flex justify-between"><dt>Paid</dt><dd>{taka(data.paid)}</dd></div><div className="flex justify-between text-amber-700"><dt>Due to supplier</dt><dd>{taka(data.total - data.paid)}</dd></div></dl></Card>
          {can('purchases.manage') && data.status === 'received' && <Btn variant="danger" onClick={async () => { if (!(await ask({ title: 'Cancel this purchase?', message: 'Stock added by this purchase is removed again and any money paid is returned to the account. This only works if the stock has not been sold.', confirmLabel: 'Cancel purchase' }))) return; try { await post(`/ops/purchases/${id}/cancel`); toast('Purchase cancelled'); onChanged(); } catch (e) { toast(e.message, 'error'); } }}>Cancel purchase</Btn>}
        </div>)}{node}
    </Drawer>
  );
}

export default function Purchases() {
  const [q, setQ] = useState(''); const dq = useDebounced(q); const [status, setStatus] = useState('all'); const [page, setPage] = useState(1); const [open, setOpen] = useState(null);
  const { data, error, loading, reload } = useFetch('/ops/purchases', { q: dq || undefined, status, page });
  return (
    <>
      <PageHeader title="Purchases" subtitle="Stock bought from suppliers." actions={<Link href="/admin/purchases/new"><Btn icon="plus">New purchase</Btn></Link>} />
      <Tabs className="mb-3" value={status} onChange={(v) => { setStatus(v); setPage(1); }} tabs={[{ value: 'all', label: 'All' }, { value: 'due', label: 'Has due' }]} />
      <div className="mb-3"><SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Reference or supplier" className="w-full sm:w-72" /></div>
      {error && <Alert>{error}</Alert>}
      <Card pad={false}><div className="px-2 pb-2"><Table loading={loading} rows={data?.items} onRowClick={(r) => setOpen(r.id)} empty="No purchases yet." columns={[
        { label: 'Ref', render: (p) => <b>{p.ref_no}</b> }, { label: 'Date', render: (p) => fmtDate(p.purchase_date) }, { label: 'Supplier', key: 'supplier' }, { label: 'Items', align: 'right', key: 'item_count' },
        { label: 'Total', align: 'right', render: (p) => taka(p.total) }, { label: 'Paid', align: 'right', render: (p) => taka(p.paid) }, { label: 'Due', align: 'right', render: (p) => (p.status === 'received' && p.due > 0 ? <b className="text-amber-700">{taka(p.due)}</b> : '—') }, { label: 'Status', render: (p) => <Badge tone={p.status === 'received' ? 'green' : 'red'}>{p.status}</Badge> },
      ]} />{data && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} label="purchases" />}</div></Card>
      {open && <Detail id={open} onClose={() => setOpen(null)} onChanged={() => { setOpen(null); reload(); }} />}
    </>
  );
}
