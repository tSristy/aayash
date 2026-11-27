'use client';
import { useFetch, post } from '@/lib/admin-api';
import SettingsForm from '@/components/admin/ui/SettingsForm';
import { Alert, Badge, Btn, Card, PageHeader, SectionTitle, Table, useToast } from '@/components/admin/ui/kit';
import { fmtDateTime } from '@/lib/format';
import { useAdmin } from '@/components/admin/AdminContext';

export default function Marketing() {
  const toast = useToast(); const { can } = useAdmin();
  const { data, reload } = useFetch('/ops/capi-events');
  const retry = async () => { try { const r = await post('/ops/capi-events/retry'); toast(`Retried ${r.retried} event(s)`); reload(); } catch (e) { toast(e.message, 'error'); } };
  return (<>
    <PageHeader title="Facebook Pixel & Conversions API" subtitle="Browser pixel plus server-side events, de-duplicated by event ID." />
    <SettingsForm save="/ops/settings/marketing" sections={[
      { title: 'Meta Pixel (browser)', description: 'Tracks PageView, ViewContent, AddToCart, InitiateCheckout and Purchase in the visitor’s browser.', fields: [{ key: 'pixel_enabled', label: 'Enable pixel', type: 'toggle', span: 2 }, { key: 'pixel_id', label: 'Pixel ID', placeholder: '1234567890' }] },
      { title: 'Conversions API (server)', description: 'Sends Purchase from our server so ad blockers and iOS cannot hide it. Create the access token in Meta Events Manager.', fields: [{ key: 'capi_enabled', label: 'Enable Conversions API', type: 'toggle', span: 2 }, { key: 'capi_access_token', label: 'Access token', type: 'password', help: 'Stored encrypted. Leave the dots to keep the current one.', span: 2 }, { key: 'capi_test_code', label: 'Test event code', help: 'Optional. Use while testing, then clear it.' }] },
    ]} />
    <Card className="mt-6" pad={false}><div className="flex items-center justify-between p-5 pb-0"><SectionTitle>Recent server events</SectionTitle>{can('marketing.manage') && <Btn size="sm" variant="outline" onClick={retry}>Retry failed</Btn>}</div>
      <div className="px-2 pb-3"><Table rows={data?.items} empty="No events yet. They appear when orders are placed." columns={[{ label: 'Event', render: (e) => <b>{e.event_name}</b> }, { label: 'Order', render: (e) => e.order_id || '—' }, { label: 'Status', render: (e) => <Badge tone={e.status === 'sent' ? 'green' : e.status === 'failed' ? 'red' : 'amber'}>{e.status}</Badge> }, { label: 'Tries', align: 'right', key: 'attempts' }, { label: 'When', render: (e) => fmtDateTime(e.created_at) }, { label: 'Response', render: (e) => <span className="block max-w-xs truncate text-xs text-taupe-600">{e.response}</span> }]} /></div></Card></>);
}
