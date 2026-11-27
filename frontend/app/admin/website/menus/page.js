'use client';
import ResourceManager, { ActiveBadge } from '@/components/admin/ui/ResourceManager';
import { Badge } from '@/components/admin/ui/kit';
export default function Menus() {
  return <ResourceManager title="Menus" subtitle="Links in the website header and footer." endpoint="/ops/cms/menu-links" noun="link" writePerm="website.manage" createLabel="Add link"
    filters={[{ name: 'location', label: 'Where', options: [{ value: 'header', label: 'Header' }, { value: 'footer', label: 'Footer' }] }]}
    columns={[{ label: 'Label', render: (m) => <b>{m.label}</b> }, { label: 'Link', render: (m) => <code>{m.url}</code> }, { label: 'Where', render: (m) => <Badge>{m.location}</Badge> }, { label: 'Group', key: 'group_name' }, { label: 'Order', align: 'right', key: 'sort_order' }, { label: 'Status', render: (m) => <ActiveBadge on={m.is_active} /> }]}
    fields={[{ name: 'location', label: 'Where', type: 'select', required: true, options: [{ value: 'header', label: 'Header' }, { value: 'footer', label: 'Footer' }] }, { name: 'group_name', label: 'Footer column title', help: 'Footer only, e.g. “Help”.' }, { name: 'label', label: 'Label', required: true }, { name: 'url', label: 'Link', required: true, placeholder: '/products' }, { name: 'sort_order', label: 'Order', type: 'number' }, { name: 'is_active', label: 'Show', type: 'toggle' }]} defaults={{ location: 'header', sort_order: 0, is_active: true }} />;
}
