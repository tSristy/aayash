'use client';
import { useFetch } from '@/lib/admin-api';
import { fmtDateTime } from '@/lib/format';
import { Alert, Card, PageHeader, Table } from '@/components/admin/ui/kit';
export default function Activity() {
  const { data, error, loading } = useFetch('/ops/activity');
  return (<><PageHeader title="Activity log" subtitle="Who did what — the latest 200 actions." />{error && <Alert>{error}</Alert>}
    <Card pad={false}><div className="px-2 pb-2"><Table loading={loading} rows={data?.items} empty="Nothing yet." columns={[{ label: 'When', render: (a) => fmtDateTime(a.created_at) }, { label: 'Who', render: (a) => a.username || 'system' }, { label: 'Action', render: (a) => <b className="capitalize">{String(a.action).replace(/_/g, ' ')}</b> }, { label: 'On', render: (a) => `${a.entity}${a.entity_id ? ` #${a.entity_id}` : ''}` }, { label: 'Detail', render: (a) => <span className="text-xs text-taupe-600">{a.detail}</span> }]} /></div></Card></>);
}
