'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import CopyIconButton from '@/components/ui/CopyIconButton';
import { money } from '@/lib/format';

const STATUS_STEPS = {
  booked: ['picked_up', 'cancelled'],
  picked_up: ['in_transit', 'returning'],
  in_transit: ['delivered', 'returning'],
  returning: ['returned'],
  delivered: [],
  returned: [],
  cancelled: [],
};

const inputClass = 'w-full rounded-xl border border-taupe-200 bg-wash px-3 py-2.5 text-sm focus:border-primary focus:outline-none';
const readable = (value) => String(value || '').replace(/_/g, ' ');

function trackingLink(shipment) {
  if (!shipment.tracking_url_template || !shipment.consignment_id) return '';
  try {
    const link = shipment.tracking_url_template.replace(
      '{tracking_id}',
      encodeURIComponent(shipment.consignment_id)
    );
    const parsed = new URL(link);
    return parsed.protocol === 'https:' ? parsed.toString() : '';
  } catch {
    return '';
  }
}

async function courierRequest(path, options) {
  const response = await fetch(`/api/admin/couriers${path}`, {
    credentials: 'same-origin',
    cache: 'no-store',
    ...options,
    headers: options?.body ? { 'Content-Type': 'application/json' } : undefined,
  });
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload.error || 'Courier request failed.');
  }
  return payload;
}

export default function CourierAssignment({ order, items = [], onOrderStatusChanged }) {
  const [providers, setProviders] = useState([]);
  const [shipments, setShipments] = useState([]);
  const [providerId, setProviderId] = useState('');
  const [consignment, setConsignment] = useState('');
  const [weight, setWeight] = useState('');
  const [note, setNote] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const load = useCallback(async () => {
    try {
      const [providerData, shipmentData] = await Promise.all([
        courierRequest('/providers/options?scope=active'),
        courierRequest(`/orders/${order.id}/shipments`),
      ]);
      const providerItems = providerData.items || [];
      setProviders(providerItems);
      setShipments(shipmentData);
      setProviderId((current) => providerItems.some((item) => String(item.id) === current) ? current : '');
      setError('');
    } catch (reason) {
      setError(reason.message);
    } finally {
      setLoading(false);
    }
  }, [order.id]);

  useEffect(() => {
    load();
  }, [load]);

  const hasDispatchReadyShipment = shipments.some((shipment) => (
    ['booked', 'picked_up', 'in_transit'].includes(shipment.status)
  ));
  const hasActive = shipments.some((shipment) => (
    ['booked', 'picked_up', 'in_transit', 'returning'].includes(shipment.status)
  ));
  const canBook = ['confirmed', 'packed', 'out_for_delivery'].includes(order.status) && !hasActive;
  const selectedProvider = providers.find((provider) => String(provider.id) === providerId);
  const packedUnits = items.reduce((sum, item) => sum + Number(item.qty || 0), 0);
  const codAmount = order.payment_method === 'cod' && order.payment_status !== 'paid' ? order.total : 0;
  const packingSummary = [
    `Order: ${order.order_no}`,
    `Customer: ${order.guest_name}`,
    `Phone: ${order.guest_phone}`,
    `Address: ${order.address_line}${order.area ? `, ${order.area}` : ''}, ${order.city}`,
    ...items.map((item) => `${item.name}${item.variant_label ? ` (${item.variant_label})` : ''} x ${item.qty}`),
    `Items: ${packedUnits}`,
    `Total: ${money(order.total)}`,
    `COD to collect: ${money(codAmount)}`,
  ].join('\n');

  async function createShipment(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');

    try {
      await courierRequest(`/orders/${order.id}/shipments`, {
        method: 'POST',
        body: JSON.stringify({
          provider_id: Number(providerId),
          consignment_id: consignment.trim(),
          weight_kg: weight || null,
          note: note.trim(),
        }),
      });
      setMessage('Manual shipment recorded successfully.');
      setConsignment('');
      setWeight('');
      setNote('');
      await load();
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  }

  async function markOutForDelivery() {
    if (!window.confirm('Courier booked. Mark this order Out for Delivery?')) {
      return;
    }

    setBusy(true);
    setError('');
    setMessage('');
    try {
      const response = await fetch(`/api/admin/orders/${order.id}/status`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'out_for_delivery' }),
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Unable to dispatch this order.');
      }
      setMessage('Order marked Out for Delivery.');
      if (onOrderStatusChanged) {
        await onOrderStatusChanged();
      }
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  }

  async function updateShipment(shipmentId, newStatus) {
    if (!window.confirm(`Update courier shipment to ${readable(newStatus)}?`)) {
      return;
    }
    setBusy(true);
    setError('');

    try {
      await courierRequest(`/shipments/${shipmentId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus, note: statusNote.trim() }),
      });
      setStatusNote('');
      setMessage('Courier timeline updated. Update order status separately when appropriate.');
      await load();
    } catch (reason) {
      setError(reason.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section id="courier-shipment" className="scroll-mt-6 rounded-2xl border border-taupe-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold text-taupe-900">Courier &amp; Shipment</h2>
        <Link href="/admin/couriers" className="text-xs font-semibold text-primary-deep underline">
          Courier Settings
        </Link>
      </div>
      <p className="mt-2 text-xs leading-relaxed text-taupe-600">
        API credentials are not connected. Book on the courier merchant portal first,
        then enter the actual consignment ID here.
      </p>

      {!loading && order.status === 'packed' && !hasActive && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-relaxed text-amber-900">
          <strong>Before Out for Delivery:</strong> choose an Active Courier, book the parcel in its
          merchant portal, and record the real Consignment ID below. Dispatch becomes available
          only after this shipment is saved.
        </div>
      )}
      {!loading && order.status === 'packed' && hasDispatchReadyShipment && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-xs font-medium text-emerald-900">Courier shipment recorded. Ready for dispatch.</p>
          <button
            type="button"
            disabled={busy}
            onClick={markOutForDelivery}
            className="rounded-lg bg-taupe-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            {busy ? 'Updating…' : 'Mark Out for Delivery'}
          </button>
        </div>
      )}
      {!loading && order.status === 'packed' && hasActive && !hasDispatchReadyShipment && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
          An earlier shipment is returning. Resolve that shipment with the courier before booking again.
        </p>
      )}
      {loading && <p className="mt-4 animate-pulse text-sm text-taupe-600">Loading shipments…</p>}
      {error && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-700">{error}</p>}
      {message && <p role="status" className="mt-3 text-xs text-emerald-800">{message}</p>}

      {!loading && canBook && (
        <div className="mt-4 rounded-xl border border-taupe-200 bg-wash/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-sm font-bold">Packing Summary</h3>
            <CopyIconButton value={packingSummary} label="Copy packing summary" className="text-taupe-700" />
          </div>
          <p className="mt-2 text-xs text-taupe-600">Order: {order.order_no} · {packedUnits} total units</p>
          <div className="mt-3 divide-y divide-taupe-200">
            {items.map((item) => (
              <div key={item.id} className="flex items-start justify-between gap-3 py-2 text-xs">
                <div>
                  <p className="font-semibold">{item.name}</p>
                  {item.variant_label && <p className="text-taupe-600">{item.variant_label}</p>}
                </div>
                <span className="shrink-0">Qty: {item.qty}</span>
              </div>
            ))}
          </div>
          <div className="mt-2 grid gap-1 border-t border-taupe-200 pt-3 text-xs">
            <p>Recipient: <strong>{order.guest_name}</strong> · {order.guest_phone}</p>
            <p>Address: {order.address_line}{order.area ? `, ${order.area}` : ''}, {order.city}</p>
            <p>Order Total: <strong>{money(order.total)}</strong> · COD to collect: <strong>{money(codAmount)}</strong></p>
          </div>
          <p className="mt-2 text-xs text-taupe-600">
            Verify physical items and package weight before booking. Copy details into your courier merchant portal.
          </p>
        </div>
      )}

      {!loading && canBook && (
        <form onSubmit={createShipment} className="mt-4 grid gap-3 border-t border-taupe-200 pt-4">
          <label className="grid gap-1 text-xs font-medium">
            Courier Provider
            <select
              className={inputClass}
              value={providerId}
              onChange={(event) => setProviderId(event.target.value)}
              required
            >
              <option value="">Choose a courier</option>
              {providers.filter((item) => item.is_active).map((provider) => (
                <option key={provider.id} value={provider.id}>{provider.name}</option>
              ))}
            </select>
          </label>
          {selectedProvider?.website_url && (
            <a
              href={selectedProvider.website_url}
              target="_blank"
              rel="noopener noreferrer"
              className="w-fit text-xs font-semibold text-primary-deep underline"
            >
              Open {selectedProvider.name} website ↗
            </a>
          )}
          {providers.length === 0 && (
            <p className="text-xs text-amber-800">No active courier. Add or activate one in Courier Management.</p>
          )}
          <label className="grid gap-1 text-xs font-medium">
            Consignment ID from courier portal
            <input
              className={inputClass}
              value={consignment}
              onChange={(event) => setConsignment(event.target.value)}
              required
              minLength={4}
              maxLength={120}
              placeholder="e.g. CN12345678"
            />
          </label>
          <label className="grid gap-1 text-xs font-medium">
            Parcel weight (kg, optional)
            <input
              className={inputClass}
              type="number"
              step="0.001"
              min="0.001"
              max="100"
              value={weight}
              onChange={(event) => setWeight(event.target.value)}
            />
          </label>
          <label className="grid gap-1 text-xs font-medium">
            Packing/Delivery Note
            <textarea className={inputClass} rows={2} maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <p className="text-xs text-taupe-600">
            COD is calculated securely by the backend; expected collection: {money(codAmount)}.
          </p>
          <button
            type="submit"
            disabled={busy || !providerId}
            className="rounded-xl bg-taupe-900 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Record Manual Shipment'}
          </button>
        </form>
      )}

      {!loading && !canBook && !shipments.length && (
        <p className="mt-4 text-sm text-taupe-600">Confirm the order before recording a shipment.</p>
      )}

      <div className="mt-4 grid gap-4">
        {shipments.map((shipment) => (
          <div key={shipment.id} className="rounded-xl border border-taupe-200 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-sm font-bold">{shipment.courier_name}</p>
                <div className="mt-1 flex items-center gap-2 text-xs text-taupe-600">
                  <span className="font-mono">{shipment.consignment_id}</span>
                  <CopyIconButton
                    value={shipment.consignment_id}
                    label="Copy consignment ID"
                    className="!h-7 !w-7"
                  />
                </div>
              </div>
              <span className="rounded-lg bg-wash px-2 py-1 text-xs font-bold capitalize">
                {readable(shipment.status)}
              </span>
            </div>
            <p className="mt-2 text-xs text-taupe-600">COD: {money(shipment.cod_amount)} · Manual booking</p>
            {trackingLink(shipment) && (
              <a
                href={trackingLink(shipment)}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs font-semibold text-primary-deep underline"
              >
                Open courier tracking ↗
              </a>
            )}
            {STATUS_STEPS[shipment.status]?.length > 0 && (
              <div className="mt-3 grid gap-2">
                <textarea
                  className={inputClass}
                  rows={2}
                  maxLength={500}
                  placeholder="Optional status note"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                />
                <div className="flex flex-wrap gap-2">
                  {STATUS_STEPS[shipment.status].map((next) => (
                    <button
                      type="button"
                      key={next}
                      disabled={busy}
                      onClick={() => updateShipment(shipment.id, next)}
                      className="rounded-lg border border-taupe-200 px-3 py-1.5 text-xs font-semibold capitalize hover:bg-wash disabled:opacity-50"
                    >
                      Mark {readable(next)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-3 border-t border-taupe-200 pt-3">
              <p className="mb-2 text-xs font-semibold">Shipment Timeline</p>
              {shipment.events.map((event) => (
                <div key={event.id} className="mb-2 border-l-2 border-primary pl-2 text-xs">
                  <p className="font-semibold capitalize">{readable(event.mapped_status)}</p>
                  {event.note && <p className="text-taupe-600">{event.note}</p>}
                  <p className="text-taupe-500">{new Date(event.event_time).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
