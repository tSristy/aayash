'use client';
import Link from 'next/link';
import { useState } from 'react';
import { api, patch, post, useDebounced, useFetch } from '@/lib/admin-api';
import { taka } from '@/lib/format';
import { Alert, Badge, Btn, Card, PageHeader, Pagination, SearchBox, Table, Toggle, useToast } from '@/components/admin/ui/kit';
import { downloadCsv } from '@/components/admin/ui/csv';

function NumCell({ value, onSave, label, width = 'w-20' }) {
  const [v, setV] = useState(String(value));
  return <input type="number" min="0" aria-label={label} value={v} onChange={(e) => setV(e.target.value)} onBlur={() => { if (String(value) !== v && v !== '') onSave(Number(v)); }} onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()} className={`${width} rounded-lg border border-taupe-200 px-2 py-1.5 text-sm`} />;
}

export default function Arrange() {
  const toast = useToast();
  const [q, setQ] = useState(''); const dq = useDebounced(q); const [page, setPage] = useState(1); const [sort, setSort] = useState('position'); const [flag, setFlag] = useState('');
  const { data, error, loading, reload } = useFetch('/ops/products', { q: dq || undefined, page, sort, limit: 30, free_delivery: flag === 'free' ? '1' : undefined, combo: flag === 'combo' ? '1' : flag === 'single' ? '0' : undefined, low: flag === 'low' ? '1' : undefined });
  const save = async (id, body) => { try { await patch(`/ops/products/${id}/meta`, body); toast('Saved'); reload(); } catch (e) { toast(e.message, 'error'); } };
  const exportCsv = async () => { const d = await api('/ops/products/export'); downloadCsv('products.csv', [['Product ID', 'Product', 'Category', 'Brand', 'Status', 'Variant', 'SKU', 'Barcode', 'Price', 'Compare price', 'Cost', 'Stock', 'Sold', 'Views'], ...d.items.map((r) => [r.product_id, r.name, r.category, r.brand, r.status, r.label, r.sku, r.barcode, r.price, r.compare_at_price, r.cost_price, r.stock, r.sold_count, r.view_count])]); };
  return (
    <>
      <PageHeader title="Position & flags" subtitle="Pin products to the top of the shop, mark free delivery, and set low-stock alerts. Position 1 shows first; 0 means automatic." actions={<Btn variant="outline" icon="download" onClick={exportCsv}>Export CSV</Btn>} />
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search products" className="w-full sm:w-72" />
        <select aria-label="Sort" value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} className="rounded-full bg-white px-4 py-2 text-sm shadow-card"><option value="position">Pinned first</option><option value="newest">Newest</option><option value="sold">Best selling</option><option value="views">Most viewed</option><option value="stock">Lowest stock</option></select>
        <select aria-label="Filter" value={flag} onChange={(e) => { setFlag(e.target.value); setPage(1); }} className="rounded-full bg-white px-4 py-2 text-sm shadow-card"><option value="">All products</option><option value="free">Free delivery</option><option value="low">Low stock</option><option value="single">Single products</option><option value="combo">Combo packs</option></select>
      </div>
      {error && <Alert>{error}</Alert>}
      <Card pad={false}><div className="px-2 pb-2"><Table loading={loading} rows={data?.items} empty="No products." columns={[
        { label: 'Product', render: (p) => <div className="flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-lg bg-taupe-100">{p.image_url && <img src={p.image_url} alt="" className="h-full w-full object-cover" />}</span><div><Link href={`/admin/products/${p.id}`} className="font-medium hover:underline">{p.name}</Link><p className="text-xs text-taupe-600">{p.category_name} · from {taka(p.min_price)}</p></div></div> },
        { label: 'Position', render: (p) => <NumCell key={`${p.id}-${p.sort_position}`} value={p.sort_position} label={`Position for ${p.name}`} onSave={(n) => save(p.id, { sort_position: n })} /> },
        { label: 'Free delivery', render: (p) => <Toggle checked={!!p.is_free_delivery} onChange={(v) => save(p.id, { is_free_delivery: v })} label="" /> },
        { label: 'Featured', render: (p) => <Toggle checked={!!p.is_featured} onChange={(v) => save(p.id, { is_featured: v })} label="" /> },
        { label: 'Stock', align: 'right', render: (p) => <span className={p.is_low ? 'font-bold text-danger' : ''}>{p.stock_total}</span> },
        { label: 'Low at', render: (p) => <NumCell key={`${p.id}-${p.low_stock_level}`} value={p.low_stock_level} label={`Low stock level for ${p.name}`} width="w-16" onSave={(n) => save(p.id, { low_stock_level: n })} /> },
        { label: 'Views / sold', align: 'right', render: (p) => <span className="text-xs text-taupe-600">{p.view_count} / {p.sold_count}</span> },
        { label: '', render: (p) => <>{p.is_combo && <Badge tone="blue">combo</Badge>}{p.status !== 'active' && <Badge>{p.status}</Badge>}</> },
      ]} />{data && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} label="products" />}</div></Card>
    </>
  );
}
