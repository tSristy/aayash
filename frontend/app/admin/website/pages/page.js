'use client';
import ResourceManager from '@/components/admin/ui/ResourceManager';
import { Badge } from '@/components/admin/ui/kit';
export default function Pages() {
  return <ResourceManager title="Pages" subtitle="About us, Privacy policy, Return policy, Terms… shown at /pages/your-slug." endpoint="/ops/cms/pages" noun="page" writePerm="website.manage" createLabel="Add page"
    columns={[{ label: 'Title', render: (p) => <b>{p.title}</b> }, { label: 'Address', render: (p) => <code>/pages/{p.slug}</code> }, { label: 'Footer', render: (p) => (p.show_in_footer ? 'Yes' : 'No') }, { label: 'Status', render: (p) => <Badge tone={p.is_published ? 'green' : 'gray'}>{p.is_published ? 'Published' : 'Draft'}</Badge> }]}
    fields={[{ name: 'title', label: 'Title', required: true }, { name: 'slug', label: 'Address (slug)', required: true, help: 'Lowercase letters, numbers and dashes.' }, { name: 'body', label: 'Content', type: 'richtext', span: 2, help: 'Use the toolbar for headings, bold, lists and links. Unsafe code is removed when you save.' }, { name: 'meta_description', label: 'Search description', span: 2 }, { name: 'sort_order', label: 'Order', type: 'number' }, { name: 'is_published', label: 'Published', type: 'toggle' }, { name: 'show_in_footer', label: 'Link in footer', type: 'toggle' }]} defaults={{ is_published: true, show_in_footer: true, sort_order: 0 }} modalWidth="max-w-3xl" />;
}
