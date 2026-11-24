'use client';

import Link from 'next/link';
import { useRef, useState } from 'react';
import { useCart } from '@/components/CartContext';
import Button from '@/components/ui/Button';
import Stepper from '@/components/ui/Stepper';
import Field, { inputCls } from '@/components/ui/Field';
import { Section, PageTitle } from '@/components/ui/Section';
import { API } from '@/lib/api';
import { money } from '@/lib/format';
import CopyIconButton from '@/components/ui/CopyIconButton';
import { DELIVERY_CITIES, deliveryForCity } from '@/lib/shipping';
import CityCombobox from '@/components/CityCombobox';
import CatalogImage from '@/components/CatalogImage';

const sharpInput = `${inputCls} !rounded-none !border-[#E2D9CE] !bg-white focus:!border-[#A65A3E]`;

function newTrackingCode() {
  const bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, '0')).join('');
}

export default function CartPage() {
  const { items, ready, subtotal, setQty, remove, clear } = useCart();
  const checkoutCode = useRef(null);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    line1: '',
    city: '',
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

  const delivery = form.city ? deliveryForCity(form.city) : null;

  async function placeOrder(event) {
    event.preventDefault();

    if (busy) {
      return;
    }

    if (!DELIVERY_CITIES.includes(form.city)) {
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
          address: { line1: form.line1, city: form.city },
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
        <div className="grid max-w-[560px] justify-items-start gap-4 border border-[#E2D9CE] bg-[#F5F1EB] p-8 sm:p-10">
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#A65A3E]">
            Order Received
          </p>
          <PageTitle className="!font-serif !font-normal !text-[#2E261F]">
            Order placed
          </PageTitle>
          <p className="text-sm leading-relaxed text-stone-700">
            We will call you to confirm delivery. Save your order number
            to track the status any time, even from another browser.
          </p>
          <div className="w-full border border-[#E2D9CE] bg-white p-4">
            <p className="text-[11px] uppercase tracking-wider text-stone-500">
              Your order number
            </p>
            <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
              <strong className="select-all font-mono text-lg text-[#2E261F]">
                {order.orderNo}
              </strong>
              <CopyIconButton
                value={order.orderNo}
                label="Copy order number"
                className="!rounded-none text-[#A65A3E]"
                onResult={(ok) => setCopyMessage(ok ? 'Copied!' : 'Select the number to copy manually.')}
              />
            </div>
            {copyMessage && (
              <p role="status" className="mt-2 text-xs text-stone-600">
                {copyMessage}
              </p>
            )}
          </div>
          <p className="border-y border-[#E2D9CE] py-3 text-sm text-stone-600">
            Total payable on delivery:{' '}
            <strong className="text-[#A65A3E]">{money(order.total)}</strong>
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              href="/orders/tracking"
              size="lg"
              className="!rounded-none !border-none !bg-[#A65A3E] !px-8 !py-3.5 !text-xs !font-semibold !uppercase !tracking-[0.2em] !text-white"
            >
              Track your order →
            </Button>
            <Button
              href="/products"
              size="lg"
              className="!rounded-none !border !border-[#A65A3E] !bg-transparent !px-8 !py-3.5 !text-xs !font-semibold !uppercase !tracking-[0.2em] !text-[#A65A3E]"
            >
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
        <div className="border border-[#E2D9CE] bg-[#F5F1EB] p-10 text-center sm:p-14">
          <PageTitle>Your cart is empty</PageTitle>
          <Link href="/products" className="text-sm text-[#A65A3E] underline">
            Browse products
          </Link>
        </div>
      </Section>
    );
  }

  return (
    <Section className="pt-8">
      <nav className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-stone-500">
        <Link href="/" className="hover:text-[#A65A3E]">Home</Link>
        <span>/</span>
        <span>Your cart</span>
      </nav>
      <PageTitle className="!font-serif !font-normal !text-[#2E261F]">Your cart</PageTitle>

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div className="border border-[#E2D9CE] bg-white px-5 sm:px-6">
          {items.map((item) => (
            <div
              key={item.variantId}
              className="grid grid-cols-[56px_1fr_auto] items-center gap-4 border-b border-[#E2D9CE] py-5 last:border-b-0 sm:grid-cols-[72px_1fr_auto_96px]"
            >
              <Link
                href={`/products/${item.slug}`}
                className="h-14 w-14 overflow-hidden bg-[#F5F1EB]"
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
                <Link href={`/products/${item.slug}`} className="font-serif text-base text-[#2E261F]">
                  {item.name}
                </Link>
                <small className="text-xs text-stone-500">
                  {item.label} · {money(item.price)} each
                </small>
                <button
                  type="button"
                  onClick={() => remove(item.variantId)}
                  className="w-fit text-xs text-stone-400 underline"
                >
                  Remove
                </button>
              </div>
              <Stepper value={item.qty} onChange={(quantity) => setQty(item.variantId, quantity)} />
              <strong className="col-span-3 text-sm text-[#2E261F] sm:col-span-1 sm:text-right">
                {money(item.price * item.qty)}
              </strong>
            </div>
          ))}
        </div>

        <form
          onSubmit={placeOrder}
          className="grid gap-4 border border-[#E2D9CE] bg-[#F5F1EB] p-6 sm:p-7 lg:sticky lg:top-24"
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#A65A3E]">
              Checkout
            </p>
            <h2 className="mt-1 font-serif text-2xl font-normal text-[#2E261F]">Delivery details</h2>
          </div>
          <Field label="Full name">
            <input required maxLength={120} value={form.name} onChange={update('name')} autoComplete="name" className={sharpInput} />
          </Field>
          <Field label="Phone number">
            <input required type="tel" value={form.phone} onChange={update('phone')} autoComplete="tel" className={sharpInput} />
          </Field>
          <CityCombobox
            value={form.city}
            onChange={(city) => setForm((previous) => ({ ...previous, city }))}
          />
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
          <p className="text-xs text-stone-500">
            Dhaka city delivery ৳70; outside Dhaka city ৳120. Outlying areas of Dhaka District
            may require delivery confirmation.
          </p>
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
          <dl className="grid gap-2.5 border-t border-[#E2D9CE] pt-4 text-sm">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{money(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Delivery estimate</dt>
              <dd>{delivery === null ? 'Select city' : money(delivery)}</dd>
            </div>
            <div className="flex justify-between border-t border-[#E2D9CE] pt-2.5 text-base font-bold">
              <dt>Total (before coupon)</dt>
              <dd className="text-[#A65A3E]">{delivery === null ? '—' : money(subtotal + delivery)}</dd>
            </div>
          </dl>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <Button
            size="lg"
            block
            disabled={busy}
            className="!rounded-none !border-none !bg-[#A65A3E] !py-4 !text-xs !font-semibold !uppercase !tracking-[0.2em] !text-white"
          >
            {busy ? 'Placing order…' : 'Place order →'}
          </Button>
        </form>
      </div>
    </Section>
  );
}
