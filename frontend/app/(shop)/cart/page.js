'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useCart } from '@/components/CartContext';
import Button from '@/components/ui/Button';
import Stepper from '@/components/ui/Stepper';
import Field, { inputCls } from '@/components/ui/Field';
import { Section, PageTitle } from '@/components/ui/Section';
import { API } from '@/lib/api';
import { money, FREE_DELIVERY_OVER, DELIVERY_FEE } from '@/lib/format';

const sharpInput = `${inputCls} !rounded-none !border-[#E2D9CE] !bg-white focus:!border-[#A65A3E]`;

export default function CartPage() {
  const { items, ready, subtotal, setQty, remove, clear } = useCart();
  const [form, setForm] = useState({ name: '', phone: '', line1: '', area: '', city: 'Dhaka', note: '', coupon: '', pay: 'cod' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [order, setOrder] = useState(null);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const delivery = subtotal >= FREE_DELIVERY_OVER ? 0 : DELIVERY_FEE;

  const place = async (e) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const res = await fetch(`${API}/api/orders`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer: { name: form.name, phone: form.phone },
          address: { line1: form.line1, area: form.area, city: form.city },
          items: items.map((i) => ({ variantId: i.variantId, qty: i.qty })),
          paymentMethod: form.pay, couponCode: form.coupon || undefined, note: form.note,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not place the order.');
      setOrder(data); clear();
    } catch (err) {
      setError(err.message === 'Failed to fetch' ? 'Cannot reach the server. Check that the backend is running.' : err.message);
    } finally { setBusy(false); }
  };

  if (order) return (
    <Section className="pt-8">
      <div className="grid max-w-[560px] justify-items-start gap-4 border border-[#E2D9CE] bg-[#F5F1EB] p-8 sm:p-10">
        <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#A65A3E]">
          Order Confirmed
        </p>
        <PageTitle className="!font-serif !font-normal !text-[#2E261F]">Order placed</PageTitle>
        <p className="text-sm leading-relaxed text-stone-700">
          Your order number is <strong className="text-[#2E261F]">{order.orderNo}</strong>. We will call you to confirm delivery.
        </p>
        <p className="border-y border-[#E2D9CE] py-3 text-sm text-stone-600">
          Total to pay on delivery: <strong className="font-semibold text-[#A65A3E]">{money(order.total)}</strong>
        </p>
        <div className="flex flex-wrap gap-3">
          <Button
            href={`/orders/tracking?phone=${encodeURIComponent(form.phone)}`}
            size="lg"
            className="!rounded-none !border-none !bg-[#A65A3E] !px-8 !py-3.5 !text-xs !font-semibold !uppercase !tracking-[0.2em] !text-white hover:!bg-[#8F4B32]"
          >
            Track your order →
          </Button>
          <Button
            href="/products"
            size="lg"
            className="!rounded-none !border !border-[#A65A3E] !bg-transparent !px-8 !py-3.5 !text-xs !font-semibold !uppercase !tracking-[0.2em] !text-[#A65A3E] hover:!bg-[#A65A3E] hover:!text-white"
          >
            Continue shopping →
          </Button>
        </div>
      </div>
    </Section>
  );

  if (ready && items.length === 0) return (
    <Section className="pt-8">
      <div className="border border-[#E2D9CE] bg-[#F5F1EB] p-10 text-center sm:p-14">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.25em] text-[#A65A3E]">
          Your Basket
        </p>
        <PageTitle className="!font-serif !font-normal !text-[#2E261F]">Your cart is empty</PageTitle>
        <p className="mt-2 text-sm text-stone-600">
          Add a few things to get started.{' '}
          <Link href="/products" className="font-semibold uppercase tracking-wider text-[#A65A3E] underline">
            Browse products
          </Link>
        </p>
      </div>
    </Section>
  );

  return (
    <Section className="pt-8">
      <nav className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-stone-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-[#A65A3E]">Home</Link>
        <span>/</span>
        <span className="text-[#2E261F]">Cart</span>
      </nav>
      <PageTitle className="!font-serif !font-normal !text-[#2E261F]">Your cart</PageTitle>

      <div className="mt-6 grid items-start gap-8 lg:grid-cols-[1.4fr_1fr]">
        {/* Cart Items List */}
        <div className="border border-[#E2D9CE] bg-white px-5 sm:px-6">
          {items.map((i) => (
            <div
              key={i.variantId}
              className="grid grid-cols-[56px_1fr_auto] items-center gap-4 border-b border-[#E2D9CE] py-5 last:border-b-0 sm:grid-cols-[72px_1fr_auto_96px]"
            >
              <Link
                href={`/products/${i.slug}`}
                className="grid h-14 w-14 place-items-center bg-[#F5F1EB] text-4xl sm:h-[72px] sm:w-[72px]"
              >
                {i.emoji}
              </Link>
              <div className="grid gap-1">
                <Link href={`/products/${i.slug}`} className="font-serif text-base font-medium text-[#2E261F] hover:text-[#A65A3E]">
                  {i.name}
                </Link>
                <small className="text-xs text-stone-500">
                  {i.label} · {money(i.price)} each
                </small>
                <button
                  type="button"
                  onClick={() => remove(i.variantId)}
                  className="w-fit text-[11px] font-medium uppercase tracking-wider text-stone-400 underline hover:text-[#A65A3E]"
                >
                  Remove
                </button>
              </div>
              <Stepper value={i.qty} onChange={(n) => setQty(i.variantId, n)} />
              <strong className="col-span-3 text-left text-sm font-semibold text-[#2E261F] sm:col-span-1 sm:text-right">
                {money(i.price * i.qty)}
              </strong>
            </div>
          ))}
        </div>

        {/* Delivery & Checkout Panel */}
        <form onSubmit={place} className="grid gap-4 border border-[#E2D9CE] bg-[#F5F1EB] p-6 sm:p-7 lg:sticky lg:top-24">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#A65A3E]">
              Checkout
            </p>
            <h2 className="mt-1 font-serif text-2xl font-normal text-[#2E261F]">
              Delivery details
            </h2>
          </div>

          <Field label="Full name"><input required value={form.name} onChange={set('name')} autoComplete="name" className={sharpInput} /></Field>
          <Field label="Phone number"><input required type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" className={sharpInput} /></Field>
          <Field label="Address"><input required value={form.line1} onChange={set('line1')} placeholder="House, road" autoComplete="street-address" className={sharpInput} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Area"><input value={form.area} onChange={set('area')} placeholder="e.g. Dhanmondi" className={sharpInput} /></Field>
            <Field label="City"><input value={form.city} onChange={set('city')} className={sharpInput} /></Field>
          </div>
          <Field label="Delivery note (optional)"><input value={form.note} onChange={set('note')} className={sharpInput} /></Field>
          <Field label="Coupon code (optional)"><input value={form.coupon} onChange={set('coupon')} placeholder="AAYASH10" className={sharpInput} /></Field>
          <Field label="Payment">
            <select value={form.pay} onChange={set('pay')} className={sharpInput}>
              <option value="cod">Cash on delivery</option>
              <option value="bkash">bKash on delivery</option>
            </select>
          </Field>

          <dl className="grid gap-2.5 border-t border-[#E2D9CE] pt-4 text-sm">
            <div className="flex justify-between text-stone-600"><dt>Subtotal</dt><dd className="font-medium text-[#2E261F]">{money(subtotal)}</dd></div>
            <div className="flex justify-between text-stone-600"><dt>Delivery</dt><dd className="font-medium text-[#2E261F]">{delivery ? money(delivery) : 'Free'}</dd></div>
            <div className="flex justify-between border-t border-[#E2D9CE] pt-2.5 text-base font-bold text-[#2E261F]">
              <dt>Total (before coupon)</dt>
              <dd className="text-[#A65A3E]">{money(subtotal + delivery)}</dd>
            </div>
          </dl>

          {error && <p role="alert" className="text-sm font-medium text-red-700">{error}</p>}

          <Button
            size="lg"
            block
            disabled={busy}
            className="!rounded-none !border-none !bg-[#A65A3E] !py-4 !text-xs !font-semibold !uppercase !tracking-[0.2em] !text-white hover:!bg-[#8F4B32]"
          >
            {busy ? 'Placing order…' : 'Place order →'}
          </Button>
        </form>
      </div>
    </Section>
  );
}