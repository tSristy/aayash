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
    <Section>
      <div className="grid max-w-[560px] justify-items-start gap-3.5">
        <PageTitle>Order placed</PageTitle>
        <p>Your order number is <strong>{order.orderNo}</strong>. We will call you to confirm delivery.</p>
        <p className="text-muted">Total to pay on delivery: <strong className="text-ink">{money(order.total)}</strong></p>
        <Button href="/products" size="lg">Continue shopping</Button>
      </div>
    </Section>
  );

  if (ready && items.length === 0) return (
    <Section>
      <PageTitle>Your cart is empty</PageTitle>
      <p className="text-muted">Add a few things to get started. <Link href="/products" className="font-bold text-primary-deep">Browse products</Link></p>
    </Section>
  );

  return (
    <Section>
      <PageTitle>Your cart</PageTitle>
      <div className="grid items-start gap-8 lg:grid-cols-[1.4fr_1fr]">
        <div>
          {items.map((i) => (
            <div key={i.variantId} className="grid grid-cols-[56px_1fr_auto] items-center gap-4 border-b border-line py-4 sm:grid-cols-[72px_1fr_auto_90px]">
              <Link href={`/products/${i.slug}`} className="grid h-14 w-14 place-items-center rounded-2xl bg-tint text-4xl sm:h-[72px] sm:w-[72px]">{i.emoji}</Link>
              <div className="grid gap-0.5">
                <Link href={`/products/${i.slug}`}><strong>{i.name}</strong></Link>
                <small className="text-muted">{i.label} · {money(i.price)} each</small>
                <button onClick={() => remove(i.variantId)} className="w-fit text-[13px] text-muted underline">Remove</button>
              </div>
              <Stepper value={i.qty} onChange={(n) => setQty(i.variantId, n)} />
              <strong className="col-span-3 text-left sm:col-span-1 sm:text-right">{money(i.price * i.qty)}</strong>
            </div>
          ))}
        </div>

        <form onSubmit={place} className="grid gap-3.5 rounded-[20px] border border-line bg-white p-6 lg:sticky lg:top-24">
          <h2 className="text-[22px]">Delivery details</h2>
          <Field label="Full name"><input required value={form.name} onChange={set('name')} autoComplete="name" className={inputCls} /></Field>
          <Field label="Phone number"><input required type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" className={inputCls} /></Field>
          <Field label="Address"><input required value={form.line1} onChange={set('line1')} placeholder="House, road" autoComplete="street-address" className={inputCls} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Area"><input value={form.area} onChange={set('area')} placeholder="e.g. Dhanmondi" className={inputCls} /></Field>
            <Field label="City"><input value={form.city} onChange={set('city')} className={inputCls} /></Field>
          </div>
          <Field label="Delivery note (optional)"><input value={form.note} onChange={set('note')} className={inputCls} /></Field>
          <Field label="Coupon code (optional)"><input value={form.coupon} onChange={set('coupon')} placeholder="AAYASH10" className={inputCls} /></Field>
          <Field label="Payment">
            <select value={form.pay} onChange={set('pay')} className={inputCls}>
              <option value="cod">Cash on delivery</option>
              <option value="bkash">bKash on delivery</option>
            </select>
          </Field>

          <dl className="grid gap-2 border-t border-line pt-3.5">
            <div className="flex justify-between"><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div>
            <div className="flex justify-between"><dt>Delivery</dt><dd>{delivery ? money(delivery) : 'Free'}</dd></div>
            <div className="flex justify-between text-lg font-bold"><dt>Total (before coupon)</dt><dd>{money(subtotal + delivery)}</dd></div>
          </dl>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <Button size="lg" block disabled={busy}>{busy ? 'Placing order…' : 'Place order'}</Button>
        </form>
      </div>
    </Section>
  );
}
