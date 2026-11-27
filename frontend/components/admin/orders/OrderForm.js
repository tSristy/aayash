'use client';

import { useEffect, useMemo, useState } from 'react';
import { api } from '@/lib/admin-api';
import { taka } from '@/lib/format';
import { Alert, Btn, Card, Input, Select, Textarea, Toggle, IconBtn, SectionTitle } from '../ui/kit';
import VariantPicker from './VariantPicker';
import { useOrderMeta } from './common';

/** Shared by "Create order" and "Edit order". */
export default function OrderForm({ initial, mode = 'create', onSubmit, submitLabel, onCancel }) {
  const meta = useOrderMeta();
  const [cities, setCities] = useState([]);
  const [areas, setAreas] = useState([]);
  const [f, setF] = useState(() => ({
    name: '', phone: '', email: '', line1: '', city: 'Dhaka', areaId: '', source: 'phone', discount: '', deliveryFee: '', note: '', internalNote: '', autoConfirm: false, items: [], ...initial,
  }));
  const [quote, setQuote] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  useEffect(() => { fetch('/api/locations').then((r) => r.json()).then((d) => setCities(d.cities || [])).catch(() => {}); }, []);
  const cityRow = cities.find((c) => c.name === f.city);
  useEffect(() => {
    if (!cityRow || !cityRow.area_count) { setAreas([]); return; }
    fetch(`/api/locations/${cityRow.id}/areas`).then((r) => r.json()).then((d) => setAreas(d.areas || [])).catch(() => setAreas([]));
  }, [cityRow?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const subtotal = useMemo(() => f.items.reduce((s, i) => s + (Number(i.unitPrice) || 0) * (Number(i.qty) || 0), 0), [f.items]);
  useEffect(() => {
    if (!f.city || !f.items.length) { setQuote(null); return undefined; }
    const t = setTimeout(() => {
      fetch('/api/delivery-quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ city: f.city, areaId: f.areaId || undefined, items: f.items.map((i) => ({ variantId: i.variantId })), subtotal }) })
        .then((r) => r.json()).then(setQuote).catch(() => setQuote(null));
    }, 300);
    return () => clearTimeout(t);
  }, [f.city, f.areaId, f.items, subtotal]);

  const discount = Math.min(subtotal, Math.max(0, Number(f.discount) || 0));
  const delivery = f.deliveryFee !== '' && f.deliveryFee !== null ? Math.max(0, Number(f.deliveryFee) || 0) : (quote?.charge ?? 0);
  const total = Math.max(0, subtotal - discount + delivery);

  const addVariant = (v) => setF((s) => {
    const ex = s.items.find((i) => i.variantId === v.id);
    if (ex) return { ...s, items: s.items.map((i) => (i.variantId === v.id ? { ...i, qty: i.qty + 1 } : i)) };
    return { ...s, items: [...s.items, { variantId: v.id, name: v.name, label: v.label, qty: 1, unitPrice: v.price, stock: v.stock, image: v.image_url }] };
  });
  const upd = (id, patch) => setF((s) => ({ ...s, items: s.items.map((i) => (i.variantId === id ? { ...i, ...patch } : i)) }));

  async function submit(e) {
    e.preventDefault(); setError('');
    if (!f.items.length) return setError('Add at least one product.');
    setBusy(true);
    try {
      await onSubmit({
        customer: { name: f.name, phone: f.phone, email: f.email || undefined },
        address: { line1: f.line1, city: f.city, areaId: f.areaId || undefined },
        items: f.items.map((i) => ({ variantId: i.variantId, qty: Number(i.qty), unitPrice: Number(i.unitPrice) })),
        source: f.source, discount: f.discount === '' ? undefined : Number(f.discount), deliveryFee: f.deliveryFee === '' ? undefined : Number(f.deliveryFee),
        note: f.note || undefined, internalNote: f.internalNote || undefined, autoConfirm: f.autoConfirm,
      });
    } catch (err) { setError(err.message); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="grid gap-5">
        {error && <Alert>{error}</Alert>}
        <Card>
          <SectionTitle>Products</SectionTitle>
          <VariantPicker onPick={addVariant} />
          <div className="mt-4 grid gap-3">
            {f.items.length === 0 && <p className="rounded-xl bg-taupe-50 py-8 text-center text-sm text-taupe-600">Search above to add products.</p>}
            {f.items.map((i) => (
              <div key={i.variantId} className="flex flex-wrap items-center gap-3 rounded-xl border border-taupe-100 p-3">
                <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-taupe-100">{i.image ? <img src={i.image} alt="" className="h-full w-full object-cover" /> : null}</span>
                <div className="min-w-[140px] flex-1"><p className="text-sm font-medium">{i.name}</p><p className="text-xs text-taupe-600">{i.label}{i.stock !== undefined ? ` · ${i.stock} in stock` : ''}</p></div>
                <label className="grid gap-0.5 text-xs text-taupe-600">Price<input type="number" min="0" step="0.01" value={i.unitPrice} onChange={(e) => upd(i.variantId, { unitPrice: e.target.value })} className="w-24 rounded-lg border border-taupe-200 px-2 py-1.5 text-sm text-taupe-900" /></label>
                <label className="grid gap-0.5 text-xs text-taupe-600">Qty<input type="number" min="1" value={i.qty} onChange={(e) => upd(i.variantId, { qty: e.target.value })} className="w-20 rounded-lg border border-taupe-200 px-2 py-1.5 text-sm text-taupe-900" /></label>
                <p className="w-24 text-right text-sm font-bold">{taka((Number(i.unitPrice) || 0) * (Number(i.qty) || 0))}</p>
                <IconBtn icon="trash" label="Remove" onClick={() => setF((s) => ({ ...s, items: s.items.filter((x) => x.variantId !== i.variantId) }))} />
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <SectionTitle>Customer & delivery</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Full name" required value={f.name} onChange={(e) => set('name', e.target.value)} maxLength={120} />
            <Input label="Mobile number" required value={f.phone} onChange={(e) => set('phone', e.target.value)} placeholder="01XXXXXXXXX" inputMode="tel" />
            <Input label="Email (optional)" type="email" value={f.email} onChange={(e) => set('email', e.target.value)} wrap="sm:col-span-2" />
            <Select label="City / district" required value={f.city} onChange={(e) => { set('city', e.target.value); set('areaId', ''); }} options={cities.map((c) => ({ value: c.name, label: c.name }))} />
            <Select label="Area" value={f.areaId} onChange={(e) => set('areaId', e.target.value)} options={areas.map((a) => ({ value: String(a.id), label: a.name }))} placeholder={areas.length ? 'Choose area' : 'No areas for this city'} disabled={!areas.length} />
            <Textarea label="Full address" required rows={2} value={f.line1} onChange={(e) => set('line1', e.target.value)} wrap="sm:col-span-2" placeholder="House, road, landmark" />
          </div>
        </Card>
        <Card>
          <SectionTitle>Notes</SectionTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Textarea label="Customer note" rows={2} value={f.note} onChange={(e) => set('note', e.target.value)} />
            {mode === 'create' && <Textarea label="Internal note" rows={2} value={f.internalNote} onChange={(e) => set('internalNote', e.target.value)} help="Only staff can see this." />}
          </div>
        </Card>
      </div>
      <aside className="grid content-start gap-5 lg:sticky lg:top-[72px]">
        <Card>
          <SectionTitle>Summary</SectionTitle>
          {mode === 'create' && <Select label="Order source" value={f.source} onChange={(e) => set('source', e.target.value)} options={meta.sources.map((s) => ({ value: s.code, label: s.name }))} wrap="mb-4" />}
          <div className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Discount (৳)" type="number" min="0" value={f.discount} onChange={(e) => set('discount', e.target.value)} />
              <Input label="Delivery (৳)" type="number" min="0" value={f.deliveryFee} onChange={(e) => set('deliveryFee', e.target.value)} placeholder={quote ? String(quote.charge) : 'Auto'} />
            </div>
            {quote?.free && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">{quote.reason}</p>}
            <dl className="grid gap-2 border-t border-taupe-100 pt-4 text-sm">
              <div className="flex justify-between"><dt className="text-taupe-600">Subtotal</dt><dd>{taka(subtotal)}</dd></div>
              <div className="flex justify-between"><dt className="text-taupe-600">Discount</dt><dd>− {taka(discount)}</dd></div>
              <div className="flex justify-between"><dt className="text-taupe-600">Delivery</dt><dd>{taka(delivery)}</dd></div>
              <div className="flex justify-between border-t border-taupe-100 pt-2 text-base font-bold"><dt>Total (COD)</dt><dd>{taka(total)}</dd></div>
            </dl>
            {mode === 'create' && <Toggle checked={f.autoConfirm} onChange={(v) => set('autoConfirm', v)} label="Approve immediately" help="Skips the New status." />}
            <div className="flex gap-2">
              {onCancel && <Btn variant="outline" onClick={onCancel} className="flex-1">Cancel</Btn>}
              <Btn type="submit" loading={busy} className="flex-1">{submitLabel || 'Save order'}</Btn>
            </div>
          </div>
        </Card>
      </aside>
    </form>
  );
}
