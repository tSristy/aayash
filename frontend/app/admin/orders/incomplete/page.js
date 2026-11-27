'use client';
import { useState } from 'react';
import { patch, useFetch } from '@/lib/admin-api';
import { taka, fmtDateTime } from '@/lib/format';
import { Alert, Badge, Btn, Card, PageHeader, Pagination, Tabs, Table, useToast } from '@/components/admin/ui/kit';

export default function Incomplete() {
  const [status, setStatus] = useState('open');
  const [page, setPage] = useState(1);
  const toast = useToast();
  const { data, error, loading, reload } = useFetch('/orders/drafts', { status, page });
  const rows = data?.items || [];
  return (
    <>
      <PageHeader title="Incomplete orders" subtitle="Visitors who started the checkout or an ad landing-page form and did not finish. A draft is saved as soon as the first field is typed, so some have no phone number." />
      <Tabs className="mb-3" value={status} onChange={(v) => { setStatus(v); setPage(1); }} tabs={[{ value: 'open', label: 'Open' }, { value: 'converted', label: 'Became orders' }, { value: 'dismissed', label: 'Dismissed' }]} />
      {error && <Alert>{error}</Alert>}
      <Card pad={false}><div className="px-2 pb-2">
        <Table loading={loading} rows={rows} empty="No incomplete checkouts." columns={[
          { label: 'Customer', render: (d) => <><p className="font-medium">{d.name || 'No name'}</p>{d.phone ? <a href={`tel:${d.phone}`} className="text-xs text-primary-deep hover:underline">{d.phone}</a> : <Badge tone="amber">No phone</Badge>}</>},
          { label: 'Came from', render: (d) => <div className="max-w-[220px] text-xs"><p className="font-medium text-taupe-800">{d.origin === 'landing' ? (d.landing_title || 'Landing page') : 'Shop checkout'}</p>{(d.utm_source || d.fbclid) && <p className="mt-0.5 text-taupe-600">{[d.utm_source || (d.fbclid ? 'Facebook / Instagram ad' : ''), d.utm_medium, d.utm_campaign].filter(Boolean).join(' · ')}</p>}</div> },
          { label: 'Address', render: (d) => <p className="max-w-[200px] truncate text-xs text-taupe-700">{[d.address_line, d.city].filter(Boolean).join(', ') || '—'}</p> },
          { label: 'Cart', render: (d) => <p className="max-w-[260px] truncate text-xs text-taupe-700">{d.items.map((i) => `${i.name || 'Item'} ×${i.qty}`).join(', ') || '—'}</p> },
          { label: 'Subtotal', align: 'right', render: (d) => taka(d.subtotal) },
          { label: 'Last seen', render: (d) => fmtDateTime(d.updated_at) },
          { label: '', align: 'right', render: (d) => d.status === 'open' ? <Btn size="sm" variant="outline" onClick={async () => { try { await patch(`/orders/drafts/${d.id}/dismiss`); toast('Dismissed'); reload(); } catch (e) { toast(e.message, 'error'); } }}>Dismiss</Btn> : <Badge>{d.status}</Badge> },
        ]} />
        {data && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} label="checkouts" />}
      </div></Card>
    </>
  );
}
