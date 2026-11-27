'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useCart } from '@/components/CartContext';
import Button from '@/components/ui/Button';
import Stepper from '@/components/ui/Stepper';
import Field, { inputCls } from '@/components/ui/Field';
import { Section, PageTitle } from '@/components/ui/Section';
import { API } from '@/lib/api';
import { money } from '@/lib/format';
import CopyIconButton from '@/components/ui/CopyIconButton';
import { track, fbCookies } from '@/components/Pixel';
import CityCombobox from '@/components/CityCombobox';
import CatalogImage from '@/components/CatalogImage';
import { useSite } from '@/components/SiteContext';
import { TruckIcon } from '@/components/ui/Icons';

const sharpInput = `${inputCls} !border-line !bg-white focus:!border-brown`;

function newTrackingCode() {
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

function randomToken() { return newTrackingCode(); }

export default function CartPage() {
  const { items, ready, subtotal, setQty, remove, clear } = useCart();
  const site = useSite();
  const checkoutCode = useRef(null);
  const draftToken = useRef(null);
  const [cities, setCities] = useState([]);
  const [areas, setAreas] = useState([]);
  const [quote, setQuote] = useState(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    line1: '',
    city: '',
    areaId: '',
    note: '',
    coupon: '',
    pay: 'cod',
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);
  const [copyMessage, setCopyMessage] = useState('');

  const update = (field) => (event) => {
    setForm((previous) => ({ ...previous, [field]: event.target.value }));
  };

  const cityRow = cities.find((c) => c.name === form.city);
  const delivery = quote ? quote.charge : null;
  const freeMin = Number(quote?.freeOver || site.settings.free_delivery_min_order) || 0;
  const toFree = Math.max(0, freeMin - subtotal);

  useEffect(() => {
    fetch('/api/locations').then((r) => r.json()).then((d) => setCities(d.cities || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setAreas([]);
    setForm((p) => ({ ...p, areaId: '' }));
    if (cityRow && cityRow.area_count > 0) {
      fetch(`/api/locations/${cityRow.id}/areas`).then((r) => r.json()).then((d) => setAreas(d.areas || [])).catch(() => {});
    }
  }, [cityRow?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Delivery charge always comes from the server (zones, overrides, free-delivery rules).
  useEffect(() => {
    if (!form.city || !items.length) { setQuote(null); return undefined; }
    const t = setTimeout(() => {
      fetch('/api/delivery-quote', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ city: form.city, areaId: form.areaId || undefined, subtotal, items: items.map((i) => ({ variantId: i.variantId })) }) })
        .then((r) => r.json()).then((d) => setQuote(d.error ? null : d)).catch(() => setQuote(null));
    }, 250);
    return () => clearTimeout(t);
  }, [form.city, form.areaId, subtotal, items]);

  // Funnel event once per visit to the checkout.
  useEffect(() => {
    if (ready && items.length) track('InitiateCheckout', { value: subtotal, currency: 'BDT', num_items: items.length, content_ids: items.map((i) => String(i.variantId)) });
  }, [ready]); // eslint-disable-line react-hooks/exhaustive-deps

  // Save the half-filled form so staff can follow up on abandoned checkouts (needs a valid phone).
  useEffect(() => {
    if (!items.length || String(form.phone).replace(/\D/g, '').length < 10) return undefined;
    const t = setTimeout(() => {
      draftToken.current ||= randomToken();
      fetch('/api/orders/draft', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draftToken: draftToken.current, name: form.name, phone: form.phone, address: form.line1, city: form.city, subtotal, items: items.map((i) => ({ variantId: i.variantId, qty: i.qty, name: i.name })) }) }).catch(() => {});
    }, 1500);
    return () => clearTimeout(t);
  }, [form.name, form.phone, form.line1, form.city, items, subtotal]);

  async function placeOrder(event) {
    event.preventDefault();

    if (busy) {
      return;
    }

    if (!cityRow) {
      setError('Please select a city or district from the list.');
      return;
    }

    setBusy(true);
    setError('');

    try {
      // Retain this code on retries to prevent duplicate orders/stock changes.
      checkoutCode.current ||= newTrackingCode();

      const response = await fetch(`${API}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: { name: form.name, phone: form.phone },
          address: { line1: form.line1, city: form.city, areaId: form.areaId ? Number(form.areaId) : undefined },
          draftToken: draftToken.current || undefined,
          ...fbCookies(),
          items: items.map((item) => ({
            variantId: item.variantId,
            qty: item.qty,
          })),
          paymentMethod: form.pay,
          couponCode: form.coupon || undefined,
          note: form.note,
          trackingCode: checkoutCode.current,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Could not place the order.');
      }

      // Save only the order reference for same-browser convenience.
      // The random checkout token is used internally for idempotent retries.
      try {
        sessionStorage.setItem('aem-last-tracking', JSON.stringify({
          orderNo: result.orderNo,
        }));
      } catch {
        // Browser storage may be unavailable; receipt still shows the number.
      }

      if (result.eventId) track('Purchase', { value: Number(result.total) || subtotal, currency: 'BDT', content_ids: items.map((i) => String(i.variantId)), content_type: 'product', num_items: items.length }, result.eventId);
      setOrder(result);
      clear();
    } catch (reason) {
      setError(reason.message === 'Failed to fetch'
        ? 'Cannot reach the server. Check that the backend is running.'
        : reason.message);
    } finally {
      setBusy(false);
    }
  }



  if (order) {
    return (
      <Section className="pt-8">
        <div className="grid max-w-[560px] justify-items-start gap-4 rounded-2xl border border-line bg-tint p-6 sm:p-10">
          <p className="rounded-md bg-primary px-2.5 py-0.5 text-xs font-bold text-ink">Order received</p>
          <PageTitle>
            Order placed
          </PageTitle>
          <p className="text-sm leading-relaxed text-ink/80">
            We will call you to confirm delivery. Save your order number
            to track the status any time, even from another browser.
          </p>
          <div className="w-full rounded-xl border border-line bg-white p-4">
            <p className="text-xs text-muted">
              Your order number
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <strong className="select-all font-mono text-lg text-ink">
                {order.orderNo}
              </strong>
              <CopyIconButton
                value={order.orderNo}
                label="Copy order number"
                className="text-brown"
                onResult={(ok) => setCopyMessage(ok ? 'Copied!' : 'Select the number to copy manually.')}
              />
            </div>
            {copyMessage && (
              <p role="status" className="mt-2 text-xs text-muted">
                {copyMessage}
              </p>
            )}
          </div>
          <p className="border-y border-line py-3 text-sm text-muted">
            Total payable on delivery:{' '}
            <strong className="text-ink">{money(order.total)}</strong>
          </p>
          <div className="flex flex-wrap gap-3">
            <Button href="/orders/tracking" size="lg">
              Track your order →
            </Button>
            <Button href="/products" size="lg" variant="outline">
              Continue shopping →
            </Button>
          </div>
        </div>
      </Section>
    );
  }

  if (ready && items.length === 0) {
    return (
      <Section className="pt-8">
        <div className="rounded-2xl border border-line bg-tint p-10 text-center sm:p-14">
          <PageTitle>Your cart is empty</PageTitle>
          <Link href="/products" className="text-sm text-brown underline">
            Browse products
          </Link>
        </div>
      </Section>
    );
  }

  return (
    <Section className="pt-8">
      <PageTitle>Your cart</PageTitle>

      {freeMin > 0 && (
        <div className="mb-6 rounded-xl border border-line bg-tint px-4 py-3">
          <p className="flex items-center gap-2 text-sm text-brown">
            <TruckIcon size={18} />
            {toFree > 0 ? <span>Add <b>{money(toFree)}</b> more for <b>free delivery</b></span> : <b>You get free delivery on this order</b>}
          </p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white" role="progressbar" aria-valuemin={0} aria-valuemax={freeMin} aria-valuenow={Math.min(subtotal, freeMin)} aria-label="Progress to free delivery">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, (subtotal / freeMin) * 100)}%` }} />
          </div>
        </div>
      )}

      <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr] lg:gap-8">
        <div className="rounded-xl border border-line bg-white px-4 sm:px-6">
          {items.map((item) => (
            <div
              key={item.variantId}
              className="grid grid-cols-[56px_1fr_auto] items-center gap-4 border-b border-line py-4 last:border-b-0 sm:grid-cols-[72px_1fr_auto_96px]"
            >
              <Link
                href={`/products/${item.slug}`}
                className="h-14 w-14 overflow-hidden rounded-lg bg-tint sm:h-[72px] sm:w-[72px]"
              >
                <CatalogImage
                  src={item.image}
                  alt={item.name}
                  className="h-full w-full"
                  imageClassName="object-cover"
                  fallbackText="No photo"
                />
              </Link>
              <div className="grid gap-1">
                <Link href={`/products/${item.slug}`} className="text-base font-medium text-ink hover:underline">
                  {item.name}
                </Link>
                <small className="text-xs text-muted">
                  {item.label} · {money(item.price)} each
                </small>
                {item.gifts?.length > 0 && <small className="text-xs font-medium text-brown">+ Free: {item.gifts.map((g) => `${g.qty * item.qty} × ${g.name}`).join(", ")}</small>}
                <button
                  type="button"
                  onClick={() => remove(item.variantId)}
                  className="w-fit text-xs text-muted underline hover:text-ink"
                >
                  Remove
                </button>
              </div>
              <Stepper value={item.qty} onChange={(quantity) => setQty(item.variantId, quantity)} />
              <strong className="col-span-3 text-sm text-ink sm:col-span-1 sm:text-right">
                {money(item.price * item.qty)}
              </strong>
            </div>
          ))}
        </div>

        <form
          onSubmit={placeOrder}
          className="grid gap-4 rounded-xl border border-line bg-tint p-5 sm:p-7 lg:sticky lg:top-44"
        >
          <h2 className="text-xl font-bold text-brown">Delivery details</h2>
          <Field label="Full name">
            <input required maxLength={120} value={form.name} onChange={update('name')} autoComplete="name" className={sharpInput} />
          </Field>
          <Field label="Phone number">
            <input required type="tel" value={form.phone} onChange={update('phone')} autoComplete="tel" className={sharpInput} />
          </Field>
          <CityCombobox
            cities={cities.map((c) => c.name)}
            value={form.city}
            onChange={(city) => setForm((previous) => ({ ...previous, city }))}
          />
          {areas.length > 0 && (
            <Field label="Area">
              <select required value={form.areaId} onChange={update('areaId')} className={sharpInput}>
                <option value="">Choose your area</option>
                {areas.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </Field>
          )}
          <Field label="Address">
            <input
              required
              maxLength={255}
              value={form.line1}
              onChange={update('line1')}
              autoComplete="street-address"
              placeholder="House, road, area and landmark"
              className={sharpInput}
            />
          </Field>
          {quote?.reason && <p className="text-xs font-medium text-success">{quote.reason}</p>}
          {quote?.freeOver && !quote.free && <p className="text-xs text-muted">Free delivery on orders over {money(quote.freeOver)}.</p>}
          <Field label="Delivery note (optional)">
            <input value={form.note} onChange={update('note')} className={sharpInput} />
          </Field>
          <Field label="Coupon code (optional)">
            <input value={form.coupon} onChange={update('coupon')} className={sharpInput} />
          </Field>
          <Field label="Payment">
            <select value={form.pay} onChange={update('pay')} className={sharpInput}>
              <option value="cod">Cash on Delivery</option>
            </select>
          </Field>
          <dl className="grid gap-2.5 border-t border-line pt-4 text-sm">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{money(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Delivery estimate</dt>
              <dd>{delivery === null ? 'Select city' : delivery === 0 ? 'Free' : money(delivery)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2.5 text-base font-bold">
              <dt>Total (before coupon)</dt>
              <dd className="text-ink">{delivery === null ? '—' : money(subtotal + delivery)}</dd>
            </div>
          </dl>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <Button size="lg" block disabled={busy}>
            {busy ? 'Placing order…' : 'Place order →'}
          </Button>
        </form>
      </div>
    </Section>
  );
}
