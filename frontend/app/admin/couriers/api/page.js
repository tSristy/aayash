'use client';
import { useState } from 'react';
import { post, put, useFetch } from '@/lib/admin-api';
import { Alert, Badge, Btn, Card, Input, PageHeader, Select, Spinner, Toggle, useToast } from '@/components/admin/ui/kit';

function Provider({ p }) {
  const toast = useToast(); const { data, reload } = useFetch(`/couriers/providers/${p.id}/api`);
  const [vals, setVals] = useState({}); const [enabled, setEnabled] = useState(null); const [mode, setMode] = useState(null); const [busy, setBusy] = useState(false); const [test, setTest] = useState(null);
  if (!data) return <Card><Spinner /></Card>;
  const en = enabled ?? data.api_enabled; const md = mode ?? data.mode;
  async function save() { setBusy(true); try { await put(`/couriers/providers/${p.id}/api`, { credentials: vals, api_enabled: en, mode: md }); toast('Saved'); setVals({}); setEnabled(null); setMode(null); reload(); } catch (e) { toast(e.message, 'error'); } finally { setBusy(false); } }
  async function check() { setTest(null); try { setTest(await post(`/couriers/providers/${p.id}/api/test`)); } catch (e) { setTest({ ok: false, detail: e.message }); } }
  return (
    <Card><div className="mb-3 flex items-center justify-between"><p className="text-lg font-bold">{data.name}</p>{data.supported ? <Badge tone={data.api_enabled ? 'green' : 'gray'}>{data.api_enabled ? 'API on' : 'Manual only'}</Badge> : <Badge>No API available</Badge>}</div>
      {!data.supported ? <p className="text-sm text-taupe-600">This courier has no built-in API connection. Book it manually from the order page and type the consignment ID.</p> : (
        <div className="grid gap-4"><div className="grid gap-3 sm:grid-cols-2">{data.fields.map((f) => <Input key={f.key} label={f.label} type={f.secret ? 'password' : 'text'} value={vals[f.key] ?? f.value} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} help={f.secret && f.set ? 'Saved. Type a new value to replace it.' : undefined} />)}</div>
          <div className="grid gap-3 sm:grid-cols-2"><Select label="Mode" value={md} onChange={(e) => setMode(e.target.value)} options={[{ value: 'live', label: 'Live' }, { value: 'sandbox', label: 'Sandbox / test' }]} /><Toggle checked={en} onChange={setEnabled} label="Book parcels through the API" /></div>
          <p className="text-xs text-taupe-600">Webhook address to give the courier: <code>{data.webhook_path}</code></p>
          {test && <Alert tone={test.ok ? 'success' : 'error'}>{test.ok ? 'Connection works.' : test.detail || 'Connection failed.'}</Alert>}
          <div className="flex gap-2"><Btn loading={busy} onClick={save}>Save</Btn><Btn variant="outline" onClick={check}>Test connection</Btn></div></div>)}
    </Card>);
}
export default function CourierApi() {
  const { data } = useFetch('/couriers/providers', { limit: 100 });
  const list = Array.isArray(data) ? data : data?.items || [];
  return (<><PageHeader title="Courier API connections" subtitle="Connect Steadfast, Pathao or RedX to book parcels with one click. Keys are stored encrypted." />
    {!data ? <Spinner /> : <div className="grid gap-5">{list.filter((p) => !p.archived_at).map((p) => <Provider key={p.id} p={p} />)}{!list.length && <Alert tone="info">Add a courier first under Delivery → Couriers.</Alert>}</div>}</>);
}
