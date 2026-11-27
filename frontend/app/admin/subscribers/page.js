'use client';
import { useState } from 'react';
import { api, del, useDebounced, useFetch } from '@/lib/admin-api';
import { fmtDateTime } from '@/lib/format';
import { Alert, Btn, Card, IconBtn, PageHeader, Pagination, SearchBox, Table, useConfirm, useToast } from '@/components/admin/ui/kit';
import { downloadCsv } from '@/components/admin/ui/csv';

export default function Subscribers() {
  const toast = useToast(); const [ask, node] = useConfirm(); const [q, setQ] = useState(''); const dq = useDebounced(q); const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useFetch('/ops/subscribers', { q: dq || undefined, page, limit: 50 });
  const exportAll = async () => { const d = await api('/ops/subscribers', { query: { limit: 100, page: 1 } }); const rows = [...d.items]; for (let p = 2; p <= d.totalPages && p <= 50; p += 1) rows.push(...(await api('/ops/subscribers', { query: { limit: 100, page: p } })).items); downloadCsv('subscribers.csv', [['Email', 'Subscribed'], ...rows.map((r) => [r.email, r.created_at])]); };
  return (
    <>
      <PageHeader title="Newsletter" subtitle="Emails collected from the footer sign-up box." actions={<Btn variant="outline" icon="download" onClick={exportAll}>Export CSV</Btn>} />
      <div className="mb-3"><SearchBox value={q} onChange={(v) => { setQ(v); setPage(1); }} placeholder="Search email" className="w-full sm:w-72" /></div>
      {error && <Alert>{error}</Alert>}
      <Card pad={false}><div className="px-2 pb-2"><Table loading={loading} rows={data?.items} empty="No subscribers yet." columns={[{ label: 'Email', key: 'email' }, { label: 'Subscribed', render: (s) => fmtDateTime(s.created_at) }, { label: '', align: 'right', render: (s) => <IconBtn icon="trash" label="Remove" onClick={async () => { if (await ask({ title: 'Remove subscriber?', message: s.email, confirmLabel: 'Remove' })) { try { await del(`/ops/subscribers/${s.id}`); toast('Removed'); reload(); } catch (e) { toast(e.message, 'error'); } } }} /> }]} />{data && <Pagination page={data.page} totalPages={data.totalPages} total={data.total} onPage={setPage} label="subscribers" />}</div></Card>{node}
    </>
  );
}
