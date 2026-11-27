'use client';
import { useState } from 'react';
import { useFetch } from '@/lib/admin-api';
import { Alert, Badge, Btn, Card, PageHeader, Table } from '@/components/admin/ui/kit';
import { AdjustDialog } from '@/components/admin/stock/AdjustDialog';
import Link from 'next/link';
import { useAdmin } from '@/components/admin/AdminContext';

export default function Low() {
  const { can } = useAdmin();
  const { data, error, loading, reload } = useFetch('/ops/stock/low');
  const [adj, setAdj] = useState(null);
  return (
    <>
      <PageHeader title="Low stock" subtitle="Variants at or below their product's low-stock level. Change the level per product under Products → Position & flags." />
      {error && <Alert>{error}</Alert>}
      <Card pad={false}><div className="px-2 pb-3"><Table loading={loading} rows={data?.items} empty="Everything is well stocked." columns={[
        { label: 'Product', render: (v) => <div className="flex items-center gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-taupe-100">{v.image_url && <img src={v.image_url} alt="" className="h-full w-full object-cover" />}</span><div><p className="font-medium">{v.name}</p><p className="text-xs text-taupe-600">{v.label} · {v.sku}</p></div></div> },
        { label: 'In stock', align: 'right', render: (v) => <Badge tone={v.stock < 1 ? 'red' : 'amber'}>{v.stock < 1 ? 'Out of stock' : `${v.stock} left`}</Badge> },
        { label: 'Alert level', align: 'right', key: 'low_stock_level' },
        { label: '', align: 'right', render: (v) => <div className="flex justify-end gap-2">{can('purchases.manage') && <Link href="/admin/purchases/new"><Btn size="sm" variant="outline">Buy more</Btn></Link>}{can('stock.manage') && <Btn size="sm" variant="soft" onClick={() => setAdj(v)}>Adjust</Btn>}</div> },
      ]} /></div></Card>
      {adj && <AdjustDialog variant={adj} onClose={() => setAdj(null)} onDone={() => { setAdj(null); reload(); }} />}
    </>
  );
}
