'use client';
import ResourceManager, { ActiveBadge } from '@/components/admin/ui/ResourceManager';
import { Badge } from '@/components/admin/ui/kit';
const P = [['home_top', 'Home – top'], ['home_middle', 'Home – middle'], ['home_bottom', 'Home – bottom'], ['products_top', 'Products page – top'], ['sidebar', 'Sidebar'], ['cart', 'Cart']].map(([value, label]) => ({ value, label }));
export default function Banners() {
  return <ResourceManager title="Banners" subtitle="Promo pictures placed around the shop." endpoint="/ops/cms/banners" noun="banner" writePerm="website.manage" searchable={false} createLabel="Add banner"
    filters={[{ name: 'placement', label: 'Placement', options: P }]}
    columns={[{ label: 'Image', render: (b) => <img src={b.image_url} alt="" className="h-12 w-24 rounded-lg object-cover" /> }, { label: 'Title', key: 'title' }, { label: 'Where', render: (b) => <Badge>{P.find((p) => p.value === b.placement)?.label || b.placement}</Badge> }, { label: 'Link', key: 'link_url' }, { label: 'Status', render: (b) => <ActiveBadge on={b.is_active} /> }]}
    fields={[{ name: 'placement', label: 'Placement', type: 'select', required: true, options: P }, { name: 'title', label: 'Title' }, { name: 'image_url', label: 'Image', type: 'image', required: true, span: 2 }, { name: 'link_url', label: 'Link' }, { name: 'sort_order', label: 'Order', type: 'number' }, { name: 'is_active', label: 'Show on website', type: 'toggle' }]} defaults={{ placement: 'home_middle', sort_order: 0, is_active: true }} />;
}
