'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect, useMemo, useState } from 'react';
import { api, post, useDebounced, useFetch } from '@/lib/admin-api';
import { taka, fmtDateTime } from '@/lib/format';
import { Alert, Badge, Btn, Card, IconBtn, Menu, MenuItem, PageHeader, Pagination, SearchBox, StatusBadge, Tabs, Select, useToast, I } from '@/components/admin/ui/kit';
import { STATUS_ORDER, useOrderMeta, statusLabel } from '@/components/admin/orders/common';
import { useAdmin } from '@/components/admin/AdminContext';
import { todayStr } from '@/lib/format';

const TAB_STATUSES = ['placed', 'pending', 'confirmed', 'wfp', 'packaging', 'packed', 'out_for_delivery', 'partial_delivered', 'delivered', 'return_pending', 'returned', 'cancelled'];

function csvCell(v) { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }

function OrdersInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const { can } = useAdmin();
  const toast = useToast();
  const meta = useOrderMeta();
  const [status, setStatus] = useState(sp.get('status') || 'all');
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('');
  const [assigned, setAssigned] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [selected, setSelected] = useState(new Set());
  const q = useDebounced(search);
  const query = { status, search: q || undefined, source: source || undefined, assigned: assigned || undefined, from: from || undefined, to: to || undefined, page, limit };
  const { data, loading, error, reload } = useFetch('/orders', query);
  useEffect(() => { setPage(1); setSelected(new Set()); }, [status, q, source, assigned, from, to, limit]);
  useEffect(() => setSelected(new Set()), [page]);

  const canManage = can('orders.manage');
  const counts = data?.statusCounts || {};
  const tabs = [{ value: 'all', label: 'All', count: data?.allCount }, ...TAB_STATUSES.map((s) => ({ value: s, label: statusLabel(meta, s), count: counts[s] || 0 }))];
  const items = data?.items || [];
  const allSelected = items.length > 0 && items.every((o) => selected.has(o.id));
  const toggle = (id) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  async function bulk(body, okMsg) {
    try {
      const r = await post('/orders/bulk', { ids: [...selected], ...body });
      toast(r.failCount ? `${r.okCount} updated, ${r.failCount} skipped (${r.failures?.[0]?.error || 'not allowed'})` : okMsg || `${r.okCount} orders updated`, r.failCount ? 'error' : 'success');
      setSelected(new Set()); reload();
    } catch (e) { toast(e.message, 'error'); }
  }

  const exportCsv = () => {
    const rows = items.filter((o) => !selected.size || selected.has(o.id));
    const head = ['Order', 'Date', 'Status', 'Customer', 'Phone', 'City', 'Address', 'Items', 'Total', 'Due', 'Source', 'Courier', 'Consignment'];
    const lines = [head, ...rows.map((o) => [o.order_no, o.created_at, o.status_label, o.guest_name, o.guest_phone, o.city, o.address_line, o.items.map((i) => `${i.name} x${i.qty}`).join('; '), o.total, o.due, o.source, o.courier_name, o.consignment_id])];
    const blob = new Blob([`﻿${lines.map((r) => r.map(csvCell).join(',')).join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `orders-${todayStr()}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <>
      <PageHeader title="Orders" subtitle="Review, approve, pack and ship."
        actions={<>
          <Btn variant="outline" icon="download" onClick={exportCsv}>{selected.size ? `Export ${selected.size}` : 'Export page'}</Btn>
          {can('orders.create', 'orders.manage') && <Link href="/admin/orders/new"><Btn icon="plus">Create order</Btn></Link>}
        </>} />
      <Tabs tabs={tabs} value={status} onChange={setStatus} className="mb-3" />
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <SearchBox value={search} onChange={setSearch} placeholder="Order no, name or phone" className="w-full sm:w-72" />
        <select aria-label="Source" value={source} onChange={(e) => setSource(e.target.value)} className="rounded-full bg-white px-4 py-2 text-sm shadow-card"><option value="">All sources</option>{meta.sources.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}</select>
        <select aria-label="Assigned to" value={assigned} onChange={(e) => setAssigned(e.target.value)} className="rounded-full bg-white px-4 py-2 text-sm shadow-card"><option value="">Anyone</option>{meta.admins.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select>
        <label className="flex items-center gap-2 text-sm text-taupe-600">From<input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="rounded-full bg-white px-3 py-1.5 text-sm text-taupe-900 shadow-card" /></label>
        <label className="flex items-center gap-2 text-sm text-taupe-600">To<input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="rounded-full bg-white px-3 py-1.5 text-sm text-taupe-900 shadow-card" /></label>
        {data?.incompleteCount > 0 && <Link href="/admin/orders/incomplete" className="ml-auto"><Badge tone="orange">{data.incompleteCount} incomplete checkouts →</Badge></Link>}
      </div>

      {selected.size > 0 && canManage && (
        <div className="sticky top-[64px] z-20 mb-3 flex flex-wrap items-center gap-2 rounded-2xl bg-taupe-900 px-4 py-3 text-sm text-white shadow-pop">
          <b>{selected.size} selected</b>
          <Menu align="left" trigger={() => <Btn size="sm" variant="soft" icon="refresh">Change status</Btn>}>
            {TAB_STATUSES.filter((s) => s !== 'partial_delivered').map((s) => <MenuItem key={s} onClick={() => bulk({ action: 'status', status: s })}>{statusLabel(meta, s)}</MenuItem>)}
          </Menu>
          <Menu align="left" trigger={() => <Btn size="sm" variant="soft" icon="user">Assign</Btn>}>
            <MenuItem onClick={() => bulk({ action: 'assign', adminId: null })}>Unassign</MenuItem>
            {meta.admins.map((a) => <MenuItem key={a.id} onClick={() => bulk({ action: 'assign', adminId: a.id })}>{a.name}</MenuItem>)}
          </Menu>
          <Menu align="left" trigger={() => <Btn size="sm" variant="soft" icon="tag">Set source</Btn>}>
            {meta.sources.map((s) => <MenuItem key={s.code} onClick={() => bulk({ action: 'source', source: s.code })}>{s.name}</MenuItem>)}
          </Menu>
          <Btn size="sm" variant="soft" icon="print" onClick={() => router.push(`/admin/orders/print?ids=${[...selected].join(',')}`)}>Print invoices</Btn>
          <button className="ml-auto text-white/70 hover:text-white" onClick={() => setSelected(new Set())}>Clear</button>
        </div>
      )}

      {error && <Alert>{error}</Alert>}
      <Card pad={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead><tr className="border-b border-taupe-100 text-xs uppercase tracking-wide text-taupe-600">
              <th className="w-10 px-3 py-3"><input type="checkbox" aria-label="Select all" checked={allSelected} onChange={() => setSelected(allSelected ? new Set() : new Set(items.map((o) => o.id)))} /></th>
              <th className="px-3 py-3 font-medium">Order</th><th className="px-3 py-3 font-medium">Customer</th><th className="px-3 py-3 font-medium">Items</th>
              <th className="px-3 py-3 text-right font-medium">Amount</th><th className="px-3 py-3 font-medium">Status</th><th className="px-3 py-3 font-medium">Courier</th><th className="w-24 px-3 py-3" />
            </tr></thead>
            <tbody>
              {loading && !items.length && Array.from({ length: 6 }).map((_, i) => <tr key={i}><td colSpan={8} className="px-3 py-4"><div className="h-5 animate-pulse rounded bg-taupe-100" /></td></tr>)}
              {!loading && !items.length && <tr><td colSpan={8} className="px-3 py-16 text-center text-taupe-600">No orders match these filters.</td></tr>}
              {items.map((o) => (
                <tr key={o.id} className={`border-b border-taupe-50 align-top hover:bg-taupe-50/60 ${selected.has(o.id) ? 'bg-primary/10' : ''} ${loading ? 'opacity-60' : ''}`}>
                  <td className="px-3 py-3"><input type="checkbox" aria-label={`Select ${o.order_no}`} checked={selected.has(o.id)} onChange={() => toggle(o.id)} /></td>
                  <td className="px-3 py-3">
                    <Link href={`/admin/orders/${o.id}`} className="font-bold text-taupe-900 hover:underline">{o.order_no}</Link>
                    <p className="text-xs text-taupe-600">{fmtDateTime(o.created_at)}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      <Badge>{o.source || 'website'}</Badge>
                      {o.order_type !== 'online' && <Badge tone="blue">{o.order_type}</Badge>}
                      {o.note_count > 0 && <Badge tone="amber">{o.note_count} note{o.note_count > 1 ? 's' : ''}</Badge>}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <p className="font-medium">{o.guest_name}</p>
                    <p className="text-xs text-taupe-600">{o.guest_phone}</p>
                    <p className="max-w-[200px] truncate text-xs text-taupe-600" title={`${o.address_line}, ${o.city}`}>{o.city}</p>
                    {o.previous_orders > 0 && <Badge tone="purple" className="mt-1">{o.previous_orders} previous</Badge>}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex -space-x-2">{o.items.slice(0, 4).map((i, n) => <span key={n} title={`${i.name} × ${i.qty}`} className="grid h-9 w-9 place-items-center overflow-hidden rounded-full border-2 border-white bg-taupe-100 text-[10px]">{i.image_url ? <img src={i.image_url} alt="" className="h-full w-full object-cover" /> : i.qty}</span>)}{o.items.length > 4 && <span className="grid h-9 w-9 place-items-center rounded-full border-2 border-white bg-taupe-200 text-xs">+{o.items.length - 4}</span>}</div>
                    <p className="mt-1 max-w-[220px] truncate text-xs text-taupe-600">{o.items.map((i) => `${i.name} ×${i.qty}`).join(', ')}</p>
                  </td>
                  <td className="px-3 py-3 text-right"><p className="font-bold">{taka(o.total)}</p>{o.due > 0 && o.status !== 'cancelled' ? <p className="text-xs text-amber-700">Due {taka(o.due)}</p> : <p className="text-xs text-emerald-700">Paid</p>}</td>
                  <td className="px-3 py-3"><StatusBadge status={o.status} label={o.status_label} />{o.approved_by && <p className="mt-1 text-xs text-taupe-600">by {o.approved_by}</p>}</td>
                  <td className="px-3 py-3 text-xs text-taupe-700">{o.courier_name ? <><p className="font-medium">{o.courier_name}</p><p className="text-taupe-600">{o.consignment_id}</p></> : <span className="text-taupe-300">—</span>}</td>
                  <td className="px-3 py-3"><div className="flex justify-end gap-1">
                    {canManage && o.status === 'placed' && <IconBtn icon="check" label="Approve" variant="soft" onClick={async () => { try { await api(`/orders/${o.id}/status`, { method: 'PATCH', body: { status: 'confirmed' } }); toast(`${o.order_no} approved`); reload(); } catch (e) { toast(e.message, 'error'); } }} />}
                    <IconBtn icon="print" label="Print invoice" onClick={() => router.push(`/admin/orders/print?ids=${o.id}`)} />
                    <IconBtn icon="eye" label="Open" onClick={() => router.push(`/admin/orders/${o.id}`)} />
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-3 px-3 pb-3">
          <div className="min-w-[260px] flex-1">{data && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} label="orders" />}</div>
          <select aria-label="Rows per page" value={limit} onChange={(e) => setLimit(Number(e.target.value))} className="rounded-full bg-taupe-100 px-3 py-1.5 text-sm">{[10, 20, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}</select>
        </div>
      </Card>
    </>
  );
}

export default function OrdersPage() { return <Suspense><OrdersInner /></Suspense>; }
