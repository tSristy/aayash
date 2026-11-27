'use client';
import Link from 'next/link';
import { useState } from 'react';
import { post, useDebounced, useFetch } from '@/lib/admin-api';
import { taka, fmtDateTime } from '@/lib/format';
import { Alert, Btn, Card, PageHeader, Pagination, SearchBox, Stat, StatusBadge, Table, Tabs, useConfirm, useToast } from '@/components/admin/ui/kit';

export default function PosSales() {
  const [q, setQ] = useState(''); const [status, setStatus] = useState('all'); const [page, setPage] = useState(1);
  const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const dq = useDebounced(q); const toast = useToast(); const [ask, node] = useConfirm();
  const { data, error, loading, reload } = useFetch('/ops/pos/sales', { q: dq || undefined, status, page, from: from || undefined, to: to || undefined });
  return (
    <>
      <PageHeader title="POS sales" subtitle="Counter sales and returns." actions={<Link href="/admin/pos"><Btn icon="plus">New sale</Btn></Link>} />
      <div className="mb-4 grid gap-4 sm:grid-cols-2"><Stat label="Sales (filtered)" value={data?.total ?? '—'} icon="pos" /><Stat label="Completed revenue" value={taka(data?.revenue || 0)} icon="trend" tone="green" /></div>
      <Tabs className="mb-3" value={status} onChange={(v) => { setStatus(v); setPage(1); }} tabs={[{ value: 'all', label: 'All' }, { value: 'completed', label: 'Completed' }, { value: 'returned', label: 'Returned' }]} />
      <div className="mb-3 flex flex-wrap items-center gap-3"><SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Receipt, name or phone" className="w-full sm:w-72" />
        <input type="date" aria-label="From" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-full bg-white px-3 py-1.5 text-sm shadow-card" /><input type="date" aria-label="To" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-full bg-white px-3 py-1.5 text-sm shadow-card" /></div>
      {error && <Alert>{error}</Alert>}
      <Card pad={false}><div className="px-2 pb-2">
        <Table loading={loading} rows={data?.items} empty="No POS sales yet." columns={[
          { label: 'Receipt', render: (r) => <Link href={`/admin/orders/${r.id}`} className="font-bold hover:underline">{r.order_no}</Link> },
          { label: 'Date', render: (r) => fmtDateTime(r.created_at) },
          { label: 'Customer', render: (r) => (r.guest_phone === 'WALKIN' ? <span className="text-taupe-600">Walk-in</span> : `${r.guest_name} · ${r.guest_phone}`) },
          { label: 'Cashier', key: 'cashier' }, { label: 'Qty', align: 'right', key: 'qty' },
          { label: 'Total', align: 'right', render: (r) => <b>{taka(r.total)}</b> },
          { label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
          { label: '', align: 'right', render: (r) => r.status === 'delivered' && <Btn size="sm" variant="danger" onClick={async () => { if (!(await ask({ title: 'Return this sale?', message: 'Items go back into stock and the money is refunded from the account.', confirmLabel: 'Return sale' }))) return; try { await post(`/ops/pos/sales/${r.id}/return`); toast('Sale returned'); reload(); } catch (e) { toast(e.message, 'error'); } }}>Return</Btn> },
        ]} />
        {data && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} label="sales" />}
      </div></Card>
      {node}
    </>
  );
}
