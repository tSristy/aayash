'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useDebounced, useFetch } from '@/lib/admin-api';
import { taka, fmtDate } from '@/lib/format';
import { Alert, Badge, Card, PageHeader, Pagination, SearchBox, Table } from '@/components/admin/ui/kit';

const TAG = { VIP: 'purple', Regular: 'green', New: 'gray', Blocked: 'red' };
export default function Customers() {
  const [q, setQ] = useState(''); const dq = useDebounced(q); const [page, setPage] = useState(1); const [sort, setSort] = useState('newest'); const [blocked, setBlocked] = useState('');
  const { data, error, loading } = useFetch('/ops/customers', { q: dq || undefined, page, sort, blocked: blocked || undefined });
  return (
    <>
      <PageHeader title="Customers" subtitle="Created automatically from orders, sign-ups and Google / Facebook logins." />
      <div className="mb-3 flex flex-wrap items-center gap-3"><SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Name, phone or email" className="w-full sm:w-72" />
        <select aria-label="Sort" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} className="rounded-full bg-white px-4 py-2 text-sm shadow-card"><option value="newest">Newest</option><option value="recent">Recent order</option><option value="orders">Most orders</option><option value="spent">Highest spend</option></select>
        <select aria-label="Filter" value={blocked} onChange={(e) => { setBlocked(e.target.value); setPage(1); }} className="rounded-full bg-white px-4 py-2 text-sm shadow-card"><option value="">All customers</option><option value="1">Blocked only</option></select></div>
      {error && <Alert>{error}</Alert>}
      <Card pad={false}><div className="px-2 pb-2"><Table loading={loading} rows={data?.items} empty="No customers yet." columns={[
        { label: 'Customer', render: (c) => <><Link href={`/admin/customers/${c.id}`} className="font-bold hover:underline">{c.name}</Link><p className="text-xs text-taupe-600">{c.phone?.includes(':') ? 'Social login (no phone yet)' : c.phone}{c.email ? ` · ${c.email}` : ''}</p></> },
        { label: 'Tag', render: (c) => <Badge tone={TAG[c.tag]}>{c.tag}</Badge> }, { label: 'City', render: (c) => c.city || '—' },
        { label: 'Orders', align: 'right', render: (c) => <span>{c.orders_count} <span className="text-xs text-taupe-600">({c.delivered_count} ok)</span></span> },
        { label: 'Success', align: 'right', render: (c) => (c.success_rate == null ? '—' : <span className={c.success_rate < 50 ? 'font-bold text-danger' : ''}>{c.success_rate}%</span>) },
        { label: 'Spent', align: 'right', render: (c) => taka(c.spent) }, { label: 'Last order', render: (c) => fmtDate(c.last_order_at) },
      ]} />{data && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} label="customers" />}</div></Card>
    </>
  );
}
