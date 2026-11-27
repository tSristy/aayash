'use client';
import { useState } from 'react';
import { post, patch } from '@/lib/admin-api';
import { Alert, Btn, Input, Modal } from '../ui/kit';

/** Stock adjustment (writes to the stock ledger) + cost / barcode edit. */
export function AdjustDialog({ variant, onClose, onDone }) {
  const [change, setChange] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const n = Number(change);
  async function go() {
    setBusy(true); setError('');
    try { await post('/ops/stock/adjust', { variantId: variant.id, change: n, note }); onDone(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return (
    <Modal title={`Adjust stock · ${variant.name}`} onClose={onClose} width="max-w-md" footer={<><Btn variant="outline" onClick={onClose}>Cancel</Btn><Btn loading={busy} disabled={!Number.isInteger(n) || n === 0 || !note.trim()} onClick={go}>Save adjustment</Btn></>}>
      <div className="grid gap-4">
        {error && <Alert>{error}</Alert>}
        <p className="text-sm text-taupe-700">{variant.label} · {variant.sku} · currently <b>{variant.stock}</b> in stock</p>
        <Input label="Change (use − to remove)" type="number" value={change} onChange={(e) => setChange(e.target.value)} placeholder="e.g. 12 or -3" help={Number.isInteger(n) && n !== 0 ? `New stock: ${variant.stock + n}` : undefined} autoFocus />
        <Input label="Reason" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Recount, found stock, expired…" />
        <p className="text-xs text-taupe-600">Every change is recorded in the stock ledger with your name.</p>
      </div>
    </Modal>
  );
}

export function VariantEditDialog({ variant, onClose, onDone }) {
  const [cost, setCost] = useState(variant.cost_price ?? 0);
  const [barcode, setBarcode] = useState(variant.barcode || '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function go() {
    setBusy(true); setError('');
    try { await patch(`/ops/variants/${variant.id}`, { cost_price: Number(cost), barcode }); onDone(); } catch (e) { setError(e.message); } finally { setBusy(false); }
  }
  return (
    <Modal title={`Cost & barcode · ${variant.name}`} onClose={onClose} width="max-w-md" footer={<><Btn variant="outline" onClick={onClose}>Cancel</Btn><Btn loading={busy} onClick={go}>Save</Btn></>}>
      <div className="grid gap-4">{error && <Alert>{error}</Alert>}
        <Input label="Cost price (৳)" type="number" min="0" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} help="Used for profit reports. Purchases update this automatically (weighted average)." />
        <Input label="Barcode" value={barcode} onChange={(e) => setBarcode(e.target.value)} help="Defaults to the SKU. Scan or type the code printed on the package." />
      </div>
    </Modal>
  );
}
