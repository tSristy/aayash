'use client';
import { useEffect, useRef, useState } from 'react';
import Button from './ui/Button';
import Field, { inputCls } from './ui/Field';
import CatalogImage from './CatalogImage';
import CityCombobox from './CityCombobox';
import { track, fbCookies } from './Pixel';
import { GiftIcon } from './ui/Icons';
import { money } from '@/lib/format';

const input = `${inputCls} !border-line !bg-white focus:!border-brown`;
const token = () => { const b = new Uint8Array(32); window.crypto.getRandomValues(b); return Array.from(b, (v) => v.toString(16).padStart(2, '0')).join(''); };
const AD_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'fbclid'];

/** Where this visitor came from (ad parameters), kept for the whole visit even if they browse away and back. */
function readSource() {
  let saved = {};
  try { saved = JSON.parse(sessionStorage.getItem('aem-src') || '{}'); } catch { /* ignore */ }
  const q = new URLSearchParams(window.location.search);
  for (const k of AD_KEYS) if (q.get(k)) saved[k] = q.get(k).slice(0, 190);
  try { sessionStorage.setItem('aem-src', JSON.stringify(saved)); } catch { /* ignore */ }
  return saved;
}

/** One-page order form for ad landing pages. Saves an incomplete-order draft as soon as the first field is typed. */
export default function LandingOrder({ page }) {
  const code = useRef(null);
  const draft = useRef(null);
  const source = useRef({});
  const started = useRef(false);
  const [qty, setQty] = useState(() => Object.fromEntries(page.products.map((p, i) => [p.variant_id, i === 0 ? 1 : 0])));
  const [f, setF] = useState({ name: '', phone: '', line1: '', city: '' });
  const [cities, setCities] = useState([]); const [quote, setQuote] = useState(null);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(''); const [done, setDone] = useState(null);
  const chosen = page.products.filter((p) => qty[p.variant_id] > 0);
  const subtotal = chosen.reduce((s, p) => s + p.price * qty[p.variant_id], 0);

  useEffect(() => {
    source.current = readSource();
    fetch('/api/locations').then((r) => r.json()).then((d) => setCities(d.cities || [])).catch(() => {});
    track('ViewContent', { content_ids: page.products.map((p) => String(p.variant_id)), content_type: 'product', content_name: page.title });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!f.city || !chosen.length) { setQuote(null); return; }
    fetch('/api/delivery-quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ city: f.city, subtotal, items: chosen.map((p) => ({ variantId: p.variant_id })) }) }).then((r) => r.json()).then((d) => setQuote(d.error ? null : d)).catch(() => setQuote(null));
  }, [f.city, subtotal]); // eslint-disable-line react-hooks/exhaustive-deps

  // Draft: first typed character starts it, later edits update it. A phone number is not required.
  useEffect(() => {
    if (done || !(f.name || f.phone || f.line1 || f.city)) return undefined;
    if (!started.current) { started.current = true; track('InitiateCheckout', { content_ids: chosen.map((p) => String(p.variant_id)), content_type: 'product', value: subtotal, currency: 'BDT', num_items: chosen.length }); }
    const t = setTimeout(() => {
      draft.current ||= token();
      fetch('/api/orders/draft', { method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true, body: JSON.stringify({
        draftToken: draft.current, name: f.name, phone: f.phone, address: f.line1, city: f.city, subtotal, origin: 'landing', landingPageId: page.id,
        sourceUrl: window.location.href.slice(0, 500), source: source.current,
        items: chosen.map((p) => ({ variantId: p.variant_id, qty: qty[p.variant_id], name: p.name })),
      }) }).catch(() => {});
    }, 700);
    return () => clearTimeout(t);
  }, [f, qty, done]); // eslint-disable-line react-hooks/exhaustive-deps

  async function submit(e) {
    e.preventDefault(); if (busy) return;
    if (!chosen.length) return setError('Choose at least one product.');
    setBusy(true); setError('');
    try {
      code.current ||= token();
      const res = await fetch('/api/orders', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customer: { name: f.name, phone: f.phone }, address: { line1: f.line1, city: f.city }, items: chosen.map((p) => ({ variantId: p.variant_id, qty: qty[p.variant_id] })), paymentMethod: 'cod', trackingCode: code.current, landingPageId: page.id, draftToken: draft.current || undefined, ...fbCookies() }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Could not place the order.');
      if (data.eventId) track('Purchase', { value: Number(data.total) || subtotal, currency: 'BDT', content_type: 'product', content_ids: chosen.map((p) => String(p.variant_id)) }, data.eventId);
      setDone(data);
    } catch (x) { setError(x.message); } finally { setBusy(false); }
  }

  if (done) return (
    <div className="rounded-2xl border border-line bg-tint p-8 text-center">
      <p className="text-2xl font-bold text-brown sm:text-3xl">Order placed!</p>
      <p className="mt-2 text-ink/80">Your order number is</p>
      <p className="my-2 select-all font-mono text-xl font-bold">{done.orderNo}</p>
      <p className="text-sm text-ink/80">We will call you to confirm. Total to pay on delivery: <b>{money(done.total)}</b></p>
    </div>
  );
  const step = (id, d) => setQty((q) => ({ ...q, [id]: Math.max(0, Math.min(page.products.find((p) => p.variant_id === id)?.stock || 99, q[id] + d)) }));
  return (
    <form onSubmit={submit} className="grid min-w-0 grid-cols-1 gap-4 rounded-2xl border border-line bg-white p-5 shadow-sm sm:p-8">
      <div>
        <h2 className="text-xl font-bold text-brown sm:text-2xl">Place your order</h2>
        <p className="mt-1 text-sm text-muted">Cash on delivery. Pay when it arrives.</p>
      </div>
      <div className="grid grid-cols-1 gap-2">{page.products.map((p) => (
        <div key={p.variant_id} className="rounded-xl border border-line p-3">
          <div className="flex items-center gap-3">
            <span className="block h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-tint"><CatalogImage src={p.image_url} alt={p.name} className="h-full w-full" imageClassName="object-cover" fallbackText="" /></span>
            <div className="min-w-0 flex-1"><p className="truncate font-medium text-ink">{p.name}</p><p className="text-sm text-muted">{p.label} · {money(p.price)}{p.compare_at_price ? <s className="ml-1.5 text-xs">{money(p.compare_at_price)}</s> : null}</p></div>
            <div className="flex items-center gap-2"><button type="button" aria-label="Less" className="h-9 w-9 rounded-lg border border-line text-lg" onClick={() => step(p.variant_id, -1)}>−</button><span className="w-5 text-center font-medium" aria-live="polite">{qty[p.variant_id]}</span><button type="button" aria-label="More" className="h-9 w-9 rounded-lg border border-line text-lg" onClick={() => step(p.variant_id, 1)}>+</button></div>
          </div>
          {p.gifts?.length > 0 && qty[p.variant_id] > 0 && <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-tint px-2.5 py-1.5 text-xs text-brown"><GiftIcon size={15} className="mt-px shrink-0" /><span><b>Free:</b> {p.gifts.map((g) => `${g.qty * qty[p.variant_id]} × ${g.name}`).join(', ')}</span></p>}
        </div>))}</div>
      <Field label="Full name"><input required autoComplete="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={input} /></Field>
      <Field label="Phone number"><input required type="tel" inputMode="tel" autoComplete="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} className={input} /></Field>
      <CityCombobox cities={cities.map((c) => c.name)} value={f.city} onChange={(city) => setF({ ...f, city })} />
      <Field label="Address"><input required autoComplete="street-address" value={f.line1} onChange={(e) => setF({ ...f, line1: e.target.value })} placeholder="House, road, area" className={input} /></Field>
      <dl className="grid gap-1.5 border-t border-line pt-3 text-sm"><div className="flex justify-between"><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div><div className="flex justify-between"><dt>Delivery</dt><dd>{quote ? (quote.charge === 0 ? 'Free' : money(quote.charge)) : 'Select city'}</dd></div><div className="flex justify-between text-base font-bold"><dt>Pay on delivery</dt><dd>{quote ? money(subtotal + quote.charge) : '—'}</dd></div></dl>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
      <Button size="lg" block disabled={busy}>{busy ? 'Placing order…' : (page.button_text || 'Order now')}</Button>
    </form>
  );
}
