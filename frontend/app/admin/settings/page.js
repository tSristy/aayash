'use client';
import SettingsForm from '@/components/admin/ui/SettingsForm';
import { PageHeader } from '@/components/admin/ui/kit';
export default function General() {
  return (<><PageHeader title="Shop settings" subtitle="Business details and defaults." />
    <SettingsForm save="/ops/settings/general" sections={[
      { title: 'Business', fields: [{ key: 'site_name', label: 'Shop name' }, { key: 'contact_phone', label: 'Phone' }, { key: 'contact_email', label: 'Email' }, { key: 'currency_symbol', label: 'Currency symbol' }, { key: 'contact_address', label: 'Address', span: 2 }, { key: 'public_site_url', label: 'Website address', placeholder: 'https://yourshop.com', help: 'Used in order links and Facebook events.', span: 2 }] },
      { title: 'Defaults', fields: [{ key: 'low_stock_default', label: 'Low-stock warning at', type: 'number', help: 'Units. Each product can override this.' }, { key: 'default_sales_account_id', label: 'Account that receives sales money', type: 'select', optionsFrom: 'accounts' }, { key: 'free_delivery_min_order', label: 'Free delivery above (৳)', type: 'number' }] },
    ]} /></>);
}
