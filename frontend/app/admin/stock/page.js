'use client';
import { useState } from 'react';
import { useDebounced, useFetch } from '@/lib/admin-api';
import { taka, num } from '@/lib/format';
import { Alert, Badge, Btn, Card, PageHeader, SearchBox, Stat, Table } from '@/components/admin/ui/kit';
import { AdjustDialog, VariantEditDialog } from '@/components/admin/stock/AdjustDialog';
import { downloadCsv } from '@/components/admin/ui/csv';
import { useAdmin } from '@/components/admin/AdminContext';
import { api } from '@/lib/admin-api';

export default function Stock() {
  const { can } = useAdmin();
  const [q, setQ] = useState(''); const dq = useDebounced(q);
  const { data, error, loading, reload } = useFetch('/ops/variants', { q: dq || undefined, limit: 300 });
  const { data: rep } = useFetch('/ops/reports/stock');
  const [adj, setAdj] = useState(null); const [edit, setEdit] = useState(null);
  const manage = can('stock.manage');
  const items = data?.items || [];
  const exportAll = async () => { const d = await api('/ops/products/export'); downloadCsv('products-stock.csv', [['Product ID', 'Product', 'Category', 'Brand', 'Status', 'Variant', 'SKU', 'Barcode', 'Price', 'Compare price', 'Cost', 'Stock', 'Sold', 'Views'], ...d.items.map((r) => [r.product_id, r.name, r.category, r.brand, r.status, r.label, r.sku, r.barcode, r.price, r.compare_at_price, r.cost_price, r.stock, r.sold_count, r.view_count])]); };
  return (
    <>
      <PageHeader title="Stock levels" subtitle="Every variant, its cost and how many are on the shelf." actions={<Btn variant="outline" icon="download" onClick={exportAll}>Export all products</Btn>} />
      {rep && <div className="mb-4 grid gap-4 sm:grid-cols-2"><Stat label="Units in stock" value={num(rep.totalUnits)} icon="warehouse" /><Stat label="Stock value (at cost)" value={taka(rep.totalValue)} icon="wallet" tone="green" /></div>}
      <div className="mb-3"><SearchBox value={q} onChange={setQ} placeholder="Search product, SKU or barcode" className="w-full sm:w-80" /></div>
      {error && <Alert>{error}</Alert>}
      <Card pad={false}><div className="px-2 pb-3"><Table loading={loading} rows={items} empty="No products found." columns={[
        { label: 'Product', render: (v) => <div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-taupe-100">{v.image_url && <img src={v.image_url} alt="" className="h-full w-full object-cover" />}</span><div><p className="font-medium">{v.name}</p><p className="text-xs text-taupe-600">{v.label} · {v.sku}</p></div></div> },
        { label: 'Barcode', render: (v) => <code className="text-xs">{v.barcode}</code> },
        { label: 'Cost', align: 'right', render: (v) => (v.is_combo ? '—' : taka(v.cost_price)) },
        { label: 'Price', align: 'right', render: (v) => taka(v.price) },
        { label: 'Stock', align: 'right', render: (v) => <span className={`font-bold ${v.stock < 1 ? 'text-danger' : ''}`}>{v.stock}</span> },
        { label: 'Value', align: 'right', render: (v) => (v.is_combo ? <Badge tone="blue">combo</Badge> : taka(v.stock * v.cost_price)) },
        { label: '', align: 'right', render: (v) => <div className="flex justify-end gap-2">{manage && !v.is_combo && <Btn size="sm" variant="soft" onClick={() => setAdj(v)}>Adjust</Btn>}{can('products.manage', 'stock.manage') && !v.is_combo && <Btn size="sm" variant="outline" onClick={() => setEdit(v)}>Cost / barcode</Btn>}</div> },
      ]} /></div></Card>
      {adj && <AdjustDialog variant={adj} onClose={() => setAdj(null)} onDone={() => { setAdj(null); reload(); }} />}
      {edit && <VariantEditDialog variant={edit} onClose={() => setEdit(null)} onDone={() => { setEdit(null); reload(); }} />}
    </>
  );
}
