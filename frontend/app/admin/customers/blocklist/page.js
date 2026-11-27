'use client';
import ResourceManager from '@/components/admin/ui/ResourceManager';
import { Badge } from '@/components/admin/ui/kit';
import { fmtDateTime } from '@/lib/format';

export default function Blocklist() {
  return <ResourceManager title="Blocklist" subtitle="Phone numbers and IP addresses that cannot place orders." endpoint="/ops/blocklist" noun="entry" writePerm="customers.manage" searchable={false} createLabel="Block a number / IP"
    columns={[{ label: 'Type', render: (b) => <Badge tone={b.kind === 'ip' ? 'blue' : 'red'}>{b.kind === 'ip' ? 'IP address' : 'Phone'}</Badge> }, { label: 'Value', render: (b) => <code>{b.value}</code> }, { key: 'reason', label: 'Reason' }, { label: 'Added', render: (b) => `${fmtDateTime(b.created_at)}${b.admin ? ` · ${b.admin}` : ''}` }]}
    fields={[{ name: 'kind', label: 'Type', type: 'select', required: true, options: [{ value: 'phone', label: 'Phone number' }, { value: 'ip', label: 'IP address' }], hideOnEdit: true }, { name: 'value', label: 'Phone or IP', required: true, hideOnEdit: true }, { name: 'reason', label: 'Reason', span: 2 }]} defaults={{ kind: 'phone' }} toPayload={(b) => b} canDelete />;
}
