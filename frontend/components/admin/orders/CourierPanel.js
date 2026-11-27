'use client';
import { useState } from 'react';
import { post, patch, useFetch } from '@/lib/admin-api';
import { fmtDateTime, readable } from '@/lib/format';
import { Alert, Badge, Btn, Card, Input, Select, SectionTitle, StatusBadge, useToast } from '../ui/kit';
import { useAdmin } from '../AdminContext';

const COURIER_BOOKABLE = ['confirmed', 'packaging', 'packed', 'out_for_delivery'];
const NEXT = { booked: ['picked_up', 'cancelled'], picked_up: ['in_transit', 'returning'], in_transit: ['delivered', 'returning'], returning: ['returned'] };

export default function CourierPanel({ order, onChanged }) {
  const { can } = useAdmin();
  const toast = useToast();
  const { data: ships, reload } = useFetch(`/couriers/orders/${order.id}/shipments`);
  const { data: provs } = useFetch('/couriers/providers/options');
  const [providerId, setProviderId] = useState('');
  const [consignment, setConsignment] = useState('');
  const [mode, setMode] = useState('api');
  const [markShipped, setMarkShipped] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const providers = provs?.items || [];
  const provider = providers.find((p) => String(p.id) === String(providerId));
  const active = (ships || []).some((s) => ['booked', 'picked_up', 'in_transit', 'returning'].includes(s.status));
  const canShip = can('couriers.manage', 'orders.manage');
  const bookable = COURIER_BOOKABLE.includes(order.status) && !active && canShip;
  const effMode = provider?.api_ready ? mode : 'manual';

  async function run(key, fn, msg) {
    setBusy(key); setError('');
    try { await fn(); toast(msg); reload(); onChanged?.(); } catch (e) { setError(e.message); } finally { setBusy(''); }
  }
  const book = () => effMode === 'api'
    ? run('book', () => post(`/couriers/orders/${order.id}/book-api`, { provider_id: Number(providerId), markShipped }), 'Booked with the courier')
    : run('book', () => post(`/couriers/orders/${order.id}/shipments`, { provider_id: Number(providerId), consignment_id: consignment }).then(() => { setConsignment(''); }), 'Shipment saved');

  return (
    <Card>
      <SectionTitle>Courier</SectionTitle>
      {error && <div className="mb-3"><Alert>{error}</Alert></div>}
      {(ships || []).map((s) => (
        <div key={s.id} className="mb-3 rounded-xl border border-taupe-100 p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><p className="font-bold">{s.courier_name} <span className="font-normal text-taupe-600">· {s.consignment_id}</span></p><p className="text-xs text-taupe-600">{s.booking_mode === 'api' ? 'Booked by API' : 'Manual'} · COD {s.cod_amount} · {fmtDateTime(s.booked_at || s.created_at)}</p></div>
            <StatusBadge status={s.status === 'booked' ? 'confirmed' : s.status} label={readable(s.status)} />
          </div>
          {s.tracking_url_template && <a className="mt-1 inline-block text-xs font-medium text-primary-deep hover:underline" target="_blank" rel="noopener noreferrer" href={s.tracking_url_template.replace('{tracking_id}', encodeURIComponent(s.consignment_id))}>Track parcel ↗</a>}
          {canShip && NEXT[s.status] && (
            <div className="mt-2 flex flex-wrap gap-2">
              {s.booking_mode === 'api' && <Btn size="sm" variant="soft" icon="refresh" loading={busy === `sync${s.id}`} onClick={() => run(`sync${s.id}`, () => post(`/couriers/shipments/${s.id}/sync`), 'Status synced')}>Sync now</Btn>}
              {NEXT[s.status].map((n) => <Btn key={n} size="sm" variant="outline" loading={busy === `${s.id}${n}`} onClick={() => run(`${s.id}${n}`, () => patch(`/couriers/shipments/${s.id}/status`, { status: n }), `Shipment ${readable(n)}`)}>{readable(n)}</Btn>)}
            </div>
          )}
          {s.events?.length > 0 && <ul className="mt-2 grid gap-1 border-t border-taupe-100 pt-2 text-xs text-taupe-600">{s.events.slice(0, 4).map((e) => <li key={e.id}>{fmtDateTime(e.event_time)} · {readable(e.mapped_status)}{e.provider_status ? ` (${e.provider_status})` : ''} · {e.source}</li>)}</ul>}
        </div>
      ))}
      {!(ships || []).length && !bookable && <p className="text-sm text-taupe-600">{canShip ? 'Approve the order to book a courier.' : 'No shipment yet.'}</p>}
      {bookable && (
        <div className="grid gap-3">
          <Select label="Courier" value={providerId} onChange={(e) => setProviderId(e.target.value)} options={providers.map((p) => ({ value: String(p.id), label: p.name + (p.api_ready ? ' (API)' : '') }))} placeholder="Choose courier" />
          {provider?.api_ready && (
            <div className="flex gap-2 text-sm">{[['api', 'Book via API'], ['manual', 'Enter consignment ID']].map(([v, l]) => <button key={v} type="button" onClick={() => setMode(v)} className={`rounded-full px-3 py-1.5 ${mode === v ? 'bg-taupe-900 text-white' : 'bg-taupe-100'}`}>{l}</button>)}</div>
          )}
          {effMode === 'manual' && provider && <Input label="Consignment / tracking ID" value={consignment} onChange={(e) => setConsignment(e.target.value)} placeholder="From the courier portal" />}
          {effMode === 'api' && provider && order.status !== 'out_for_delivery' && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={markShipped} onChange={(e) => setMarkShipped(e.target.checked)} /> Mark as Shipment after booking</label>}
          <Btn onClick={book} loading={busy === 'book'} disabled={!providerId || (effMode === 'manual' && consignment.trim().length < 4)} icon="truck">{effMode === 'api' ? 'Book parcel' : 'Save shipment'}</Btn>
          {!providers.length && <p className="text-xs text-taupe-600">No courier added yet. Add one under Delivery → Couriers & API.</p>}
        </div>
      )}
    </Card>
  );
}
