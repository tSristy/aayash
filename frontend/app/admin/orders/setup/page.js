'use client';
import ResourceManager, { ActiveBadge } from '@/components/admin/ui/ResourceManager';
import { Badge } from '@/components/admin/ui/kit';

export default function Setup() {
  return (
    <div className="grid gap-10">
      <ResourceManager title="Order sources" subtitle="Where orders come from. Shown in filters and reports." endpoint="/orders/sources" noun="source" writePerm="orders.manage" searchable={false}
        columns={[{ key: 'name', label: 'Name', render: (r) => <b>{r.name}</b> }, { key: 'code', label: 'Code', render: (r) => <code className="text-xs">{r.code}</code> }, { key: 'sort_order', label: 'Order' }, { label: 'Status', render: (r) => <ActiveBadge on={r.is_active} /> }]}
        fields={[{ name: 'name', label: 'Name', required: true }, { name: 'code', label: 'Code', required: true, help: 'Lowercase letters, numbers, underscores. Cannot clash with another source.' }, { name: 'sort_order', label: 'Sort order', type: 'number' }, { name: 'is_active', label: 'Active', type: 'toggle' }]}
        defaults={{ is_active: true, sort_order: 0 }} />
      <ResourceManager title="Note presets" subtitle="One-tap texts for cancel reasons and courier / internal notes." endpoint="/orders/note-presets" noun="preset" writePerm="orders.manage" searchPlaceholder="Search presets…"
        filters={[{ name: 'kind', label: 'Type', options: [{ value: 'internal', label: 'Internal' }, { value: 'courier', label: 'Courier' }, { value: 'cancel', label: 'Cancel reason' }] }]}
        columns={[{ label: 'Type', render: (r) => <Badge tone={r.kind === 'cancel' ? 'red' : r.kind === 'courier' ? 'blue' : 'gray'}>{r.kind}</Badge> }, { key: 'text', label: 'Text' }, { label: 'Status', render: (r) => <ActiveBadge on={r.is_active} /> }]}
        fields={[{ name: 'kind', label: 'Type', type: 'select', required: true, options: [{ value: 'internal', label: 'Internal note' }, { value: 'courier', label: 'Courier note' }, { value: 'cancel', label: 'Cancel reason' }] }, { name: 'text', label: 'Text', required: true, span: 2 }, { name: 'sort_order', label: 'Sort order', type: 'number' }, { name: 'is_active', label: 'Active', type: 'toggle' }]}
        defaults={{ kind: 'internal', is_active: true, sort_order: 0 }} />
    </div>
  );
}
