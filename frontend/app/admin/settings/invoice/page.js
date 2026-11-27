'use client';
import SettingsForm from '@/components/admin/ui/SettingsForm';
import { PageHeader } from '@/components/admin/ui/kit';
export default function Invoice() {
  return (<><PageHeader title="Invoice settings" subtitle="What is printed on invoices and stickers." />
    <SettingsForm save="/ops/settings/general" sections={[{ title: 'Invoice', fields: [{ key: 'invoice_address', label: 'Address on invoice', type: 'textarea', span: 2 }, { key: 'invoice_footer', label: 'Footer note', type: 'textarea', span: 2, placeholder: 'Thank you for shopping with us!' }] }]} /></>);
}
