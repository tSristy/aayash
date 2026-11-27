'use client';
import Link from 'next/link';
import { useFetch } from '@/lib/admin-api';
import { taka } from '@/lib/format';
import { Alert, Badge, Btn, Card, PageHeader, StatusBadge, Table } from '@/components/admin/ui/kit';

export default function Combos() {
  const { data, error, loading } = useFetch('/ops/combos');
  return (
    <>
      <PageHeader title="Combo packs" subtitle="One main product plus free gifts. These show on the shop under Hot Deals." actions={<Link href="/admin/combos/new"><Btn icon="plus">New combo</Btn></Link>} />
      {error && <Alert>{error}</Alert>}
      <Card pad={false}><div className="px-2 pb-3"><Table loading={loading} rows={data?.items} empty="No combos yet." columns={[
        { label: 'Combo', render: (c) => <div className="flex items-center gap-3"><span className="grid h-11 w-11 place-items-center overflow-hidden rounded-lg bg-taupe-100">{c.image_url && <img src={c.image_url} alt="" className="h-full w-full object-cover" />}</span><Link href={`/admin/combos/${c.id}`} className="font-medium hover:underline">{c.name}</Link></div> },
        { label: 'Gifts', render: (c) => <Badge tone={c.gift_mode === 'with_main' ? 'blue' : 'gray'}>{c.gift_mode === 'with_main' ? 'Also with main' : 'Combo only'}</Badge> },
        { label: 'Items', align: 'right', key: 'item_count' }, { label: 'Price', align: 'right', render: (c) => <b>{taka(c.price)}</b> },
        { label: 'Available', align: 'right', render: (c) => <Badge tone={c.stock > 0 ? 'green' : 'red'}>{c.stock}</Badge> }, { label: 'Status', render: (c) => <StatusBadge status={c.status === 'active' ? 'active' : 'inactive'} label={c.status} /> },
        { label: '', align: 'right', render: (c) => <Link href={`/admin/combos/${c.id}`}><Btn size="sm" variant="outline">Edit</Btn></Link> },
      ]} /></div></Card>
    </>
  );
}
