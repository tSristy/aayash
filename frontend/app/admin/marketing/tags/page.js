'use client';
import ResourceManager, { ActiveBadge } from '@/components/admin/ui/ResourceManager';
import { Badge } from '@/components/admin/ui/kit';
export default function Tags() {
  return <ResourceManager title="Tracking tags" subtitle="Google Tag Manager, TikTok pixel or any script. It is inserted on every shop page — only paste code you trust." endpoint="/ops/cms/marketing-tags" noun="tag" writePerm="marketing.manage" createLabel="Add tag"
    columns={[{ label: 'Name', render: (t) => <b>{t.name}</b> }, { label: 'Placed in', render: (t) => <Badge>{t.placement}</Badge> }, { label: 'Status', render: (t) => <ActiveBadge on={t.is_active} /> }]}
    fields={[{ name: 'name', label: 'Name', required: true }, { name: 'placement', label: 'Placed in', type: 'select', options: [{ value: 'head', label: 'Page head' }, { value: 'body', label: 'Body end' }] }, { name: 'code', label: 'Code', type: 'textarea', rows: 8, mono: true, required: true, span: 2 }, { name: 'is_active', label: 'Active', type: 'toggle' }]} defaults={{ placement: 'head', is_active: true }} />;
}
