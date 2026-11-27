'use client';
import { useState } from 'react';
import { patch } from '@/lib/admin-api';
import { taka } from '@/lib/format';
import { Alert, Btn, Modal, Select, Input, Textarea } from '../ui/kit';
import { statusLabel } from './common';

const COPY = {
  cancelled: 'Cancelling releases the reserved stock. This cannot be undone.',
  returned: 'Returned items go back into stock and any collected money is refunded in Accounts.',
  delivered: 'Marks the order delivered and records the cash collection in Accounts.',
  partial_delivered: 'Enter how many units of each item the customer actually received. The rest go back into stock.',
  out_for_delivery: 'Hands the order to the courier. A courier booking must exist first.',
  return_pending: 'The courier is bringing the parcel back. Stock is restored when you mark it Returned.',
};

export default function StatusDialog({ order, items, target, meta, onClose, onDone }) {
  const [reason, setReason] = useState('');
  const [preset, setPreset] = useState('');
  const [qty, setQty] = useState(() => Object.fromEntries(items.map((i) => [i.id, i.qty])));
  const [collected, setCollected] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const presets = meta.presets.filter((p) => p.kind === 'cancel');
  const label = statusLabel(meta, target);

  const deliveredSubtotal = items.reduce((s, i) => s + Number(i.unit_price) * (Number(qty[i.id]) || 0), 0);
  const computed = Math.max(0, deliveredSubtotal - Number(order.discount || 0) + Number(order.delivery_fee || 0));

  async function go() {
    setBusy(true); setError('');
    try {
      const body = { status: target };
      if (target === 'cancelled' || target === 'returned' || target === 'return_pending') body.reason = reason || preset || undefined;
      if (target === 'partial_delivered') { body.items = items.map((i) => ({ id: i.id, delivered_qty: Number(qty[i.id]) })); if (collected !== '') body.collectedAmount = Number(collected); }
      if (target === 'delivered' && collected !== '') body.collectedAmount = Number(collected);
      await patch(`/orders/${order.id}/status`, body);
      onDone(label);
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  return (
    <Modal title={`Mark as ${label}`} onClose={onClose} width="max-w-lg"
      footer={<><Btn variant="outline" onClick={onClose}>Back</Btn><Btn variant={target === 'cancelled' ? 'danger' : 'primary'} loading={busy} onClick={go}>Confirm {label}</Btn></>}>
      <div className="grid gap-4">
        {COPY[target] && <p className="text-sm text-taupe-700">{COPY[target]}</p>}
        {error && <Alert>{error}</Alert>}
        {target === 'cancelled' && <>
          {presets.length > 0 && <Select label="Reason" value={preset} onChange={(e) => setPreset(e.target.value)} options={presets.map((p) => p.text)} placeholder="Choose a reason" />}
          <Textarea label="Extra detail (optional)" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </>}
        {(target === 'returned' || target === 'return_pending') && <Textarea label="Reason (optional)" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />}
        {target === 'partial_delivered' && (
          <div className="grid gap-2">
            {items.map((i) => (
              <div key={i.id} className="flex items-center gap-3 rounded-xl border border-taupe-100 p-3">
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{i.name}</p><p className="text-xs text-taupe-600">{i.variant_label} · ordered {i.qty} · {taka(i.unit_price)}</p></div>
                <input type="number" min="0" max={i.qty} value={qty[i.id]} aria-label={`Delivered quantity for ${i.name}`} onChange={(e) => setQty((s) => ({ ...s, [i.id]: e.target.value }))} className="w-20 rounded-lg border border-taupe-200 px-2 py-1.5 text-sm" />
              </div>
            ))}
            <p className="text-sm text-taupe-700">Expected collection: <b>{taka(computed)}</b></p>
          </div>
        )}
        {(target === 'delivered' || target === 'partial_delivered') && <Input label="Cash actually collected (optional)" type="number" min="0" value={collected} onChange={(e) => setCollected(e.target.value)} placeholder={String(target === 'delivered' ? order.total : computed)} help="Leave empty to record the expected amount." />}
      </div>
    </Modal>
  );
}
