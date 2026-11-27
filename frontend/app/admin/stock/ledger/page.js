'use client';
import { useState } from 'react';
import { useDebounced, useFetch } from '@/lib/admin-api';
import { fmtDateTime, readable } from '@/lib/format';
import { Alert, Badge, Card, PageHeader, Pagination, SearchBox, Table } from '@/components/admin/ui/kit';

const TYPES = ['opening', 'sale', 'purchase', 'adjustment', 'damage', 'return_restock', 'purchase_cancel', 'pos_sale', 'pos_return'];
export default function Ledger() {
  const [q, setQ] = useState(''); const [type, setType] = useState('all'); const [page, setPage] = useState(1); const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const dq = useDebounced(q);
  const { data, error, loading } = useFetch('/ops/stock/ledger', { q: dq || undefined, type, page, from: from || undefined, to: to || undefined });
  return (
    <>
      <PageHeader title="Stock ledger" subtitle="Every unit that came in or went out, and why." />
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Product or SKU" className="w-full sm:w-72" />
        <select aria-label="Type" value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} className="rounded-full bg-white px-4 py-2 text-sm shadow-card"><option value="all">All movements</option>{TYPES.map((t) => <option key={t} value={t}>{readable(t)}</option>)}</select>
        <input type="date" aria-label="From" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-full bg-white px-3 py-1.5 text-sm shadow-card" /><input type="date" aria-label="To" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-full bg-white px-3 py-1.5 text-sm shadow-card" />
      </div>
      {error && <Alert>{error}</Alert>}
      <Card pad={false}><div className="px-2 pb-2"><Table loading={loading} rows={data?.items} empty="No movements." columns={[
        { label: 'When', render: (r) => fmtDateTime(r.created_at) },
        { label: 'Product', render: (r) => <><p className="font-medium">{r.name}</p><p className="text-xs text-taupe-600">{r.label} · {r.sku}</p></> },
        { label: 'Type', render: (r) => <Badge tone={r.qty_change > 0 ? 'green' : 'amber'}>{readable(r.movement_type)}</Badge> },
        { label: 'Change', align: 'right', render: (r) => <b className={r.qty_change > 0 ? 'text-emerald-700' : 'text-red-700'}>{r.qty_change > 0 ? '+' : ''}{r.qty_change}</b> },
        { label: 'Balance', align: 'right', key: 'balance_after' },
        { label: 'Note', render: (r) => <span className="text-xs text-taupe-600">{r.note || (r.ref_type ? `${r.ref_type} #${r.ref_id}` : '')}</span> },
        { label: 'By', key: 'admin' },
      ]} />{data && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} label="movements" />}</div></Card>
    </>
  );
}
