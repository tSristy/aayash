'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useCart } from '@/components/CartContext';
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
    <div className="wrap section done-box">
      <h1 className="page-title">Order placed</h1>
      <p>Your order number is <strong>{order.orderNo}</strong>. We will call you to confirm delivery.</p>
      <p className="est">Total to pay on delivery: <strong>{money(order.total)}</strong></p>
      <Link href="/products" className="btn btn-lg">Continue shopping</Link>
    </div>
  );

  if (ready && items.length === 0) return (
    <div className="wrap section">
      <h1 className="page-title">Your cart is empty</h1>
      <p className="empty">Add a few things to get started. <Link href="/products" className="link">Browse products</Link></p>
    </div>
  );

  return (
    <div className="wrap section">
      <h1 className="page-title">Your cart</h1>
      <div className="cart-layout">
        <div className="cart-list">
          {items.map((i) => (
            <div className="cart-item" key={i.variantId}>
              <Link href={`/products/${i.slug}`} className="cart-emoji">{i.emoji}</Link>
              <div className="cart-info">
                <Link href={`/products/${i.slug}`}><strong>{i.name}</strong></Link>
                <small>{i.label} · {money(i.price)} each</small>
                <button className="link-btn" onClick={() => remove(i.variantId)}>Remove</button>
              </div>
              <div className="stepper">
                <button onClick={() => setQty(i.variantId, i.qty - 1)} aria-label="Decrease quantity">−</button>
                <span>{i.qty}</span>
                <button onClick={() => setQty(i.variantId, i.qty + 1)} aria-label="Increase quantity">+</button>
              </div>
              <strong className="cart-line">{money(i.price * i.qty)}</strong>
            </div>
          ))}
        </div>

        <form className="summary" onSubmit={place}>
          <h2>Delivery details</h2>
          <label>Full name<input required value={form.name} onChange={set('name')} autoComplete="name" /></label>
          <label>Phone number<input required type="tel" value={form.phone} onChange={set('phone')} autoComplete="tel" /></label>
          <label>Address<input required value={form.line1} onChange={set('line1')} placeholder="House, road" autoComplete="street-address" /></label>
          <div className="two">
            <label>Area<input value={form.area} onChange={set('area')} placeholder="e.g. Dhanmondi" /></label>
            <label>City<input value={form.city} onChange={set('city')} /></label>
          </div>
          <label>Delivery note (optional)<input value={form.note} onChange={set('note')} /></label>
          <label>Coupon code (optional)<input value={form.coupon} onChange={set('coupon')} placeholder="AAYASH10" /></label>

          <label>Payment
            <select value={form.pay} onChange={set('pay')}>
              <option value="cod">Cash on delivery</option>
              <option value="bkash">bKash on delivery</option>
            </select>
          </label>

          <dl className="totals">
            <div><dt>Subtotal</dt><dd>{money(subtotal)}</dd></div>
            <div><dt>Delivery</dt><dd>{delivery ? money(delivery) : 'Free'}</dd></div>
            <div className="grand"><dt>Total (before coupon)</dt><dd>{money(subtotal + delivery)}</dd></div>
          </dl>
          {error && <p className="err" role="alert">{error}</p>}
          <button className="btn btn-lg btn-block" disabled={busy}>{busy ? 'Placing order…' : 'Place order'}</button>
        </form>
      </div>
    </div>
  );
}
