'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { money } from '@/lib/format';
import CopyIconButton from '@/components/ui/CopyIconButton';
import CourierAssignment from '@/components/admin/courier/CourierAssignment';
import CustomerRiskCard from '@/components/admin/courier/CustomerRiskCard';

const readableStatus = (value) => String(value || '').replace(/_/g, ' ');

export default function AdminOrderDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);

    async function load() {
      try {
        const response = await fetch(`/api/admin/orders/${id}`, {
          credentials: 'same-origin',
          cache: 'no-store',
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || 'Could not load order details.');
        }
        if (active) setData(payload);
      } catch (reason) {
        if (active) setError(reason.message);
      } finally {
        if (active) setLoading(false);
      }
    }

    if (id) load();
    return () => { active = false; };
  }, [id]);

  useEffect(() => {
    // The booking shortcut comes from an async-loading order list. Scroll only
    // after the shipment section has actually been rendered.
    if (loading || !data || window.location.hash !== '#courier-shipment') return;

    const frame = window.requestAnimationFrame(() => {
      document.getElementById('courier-shipment')?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loading, data]);

  async function refreshOrderDetails() {
    const response = await fetch(`/api/admin/orders/${id}`, {
      credentials: 'same-origin',
      cache: 'no-store',
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || 'Could not refresh order details.');
    }
    setData(payload);
  }

  if (loading) {
    return <p className="p-8 text-sm text-taupe-600">Loading order details…</p>;
  }

  if (error || !data) {
    return <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error || 'Order not found.'}</p>;
  }

  const { order, items, history, customerHistory } = data;
  const phoneHref = `tel:${String(order.guest_phone).replace(/[^0-9+]/g, '')}`;

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/admin/orders" className="text-sm text-primary-deep hover:underline">
          ← Back to Orders
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-taupe-900">Order Details</h1>
        <p className="mt-1 font-mono text-sm text-taupe-600">{order.order_no}</p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="grid content-start gap-5">
          <section className="rounded-2xl border border-taupe-200 bg-white p-5">
            <h2 className="mb-4 font-bold text-taupe-900">Customer &amp; Delivery</h2>
            <div className="grid gap-3 text-sm text-taupe-800">
              <p><span className="text-taupe-600">Name:</span> <strong>{order.guest_name}</strong></p>
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-taupe-600">Phone:</span>
                <a href={phoneHref} className="font-semibold text-primary-deep underline">{order.guest_phone}</a>
                <CopyIconButton
                  value={order.guest_phone}
                  label="Copy phone number"
                  className="text-taupe-700"
                />
              </div>
              <p><span className="text-taupe-600">Address:</span> {order.address_line}{order.area ? `, ${order.area}` : ''}, {order.city}</p>
              <p><span className="text-taupe-600">Payment:</span> {order.payment_method} ({order.payment_status})</p>
              {order.note && <p><span className="text-taupe-600">Note:</span> {order.note}</p>}
            </div>
          </section>

          <section className="rounded-2xl border border-taupe-200 bg-white p-5">
            <h2 className="mb-4 font-bold text-taupe-900">Purchased Items</h2>
            <div className="divide-y divide-taupe-200 text-sm">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between gap-3 py-3">
                  <div>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-xs text-taupe-600">{item.variant_label} · {item.qty} × {money(item.unit_price)}</p>
                  </div>
                  <strong>{money(item.line_total)}</strong>
                </div>
              ))}
            </div>
            <div className="mt-3 grid gap-2 border-t border-taupe-200 pt-3 text-sm">
              <p className="flex justify-between"><span>Subtotal</span><strong>{money(order.subtotal)}</strong></p>
              <p className="flex justify-between"><span>Delivery</span><strong>{money(order.delivery_fee)}</strong></p>
              <p className="flex justify-between"><span>Discount</span><strong>{money(order.discount)}</strong></p>
              <p className="flex justify-between text-base"><span>Total</span><strong>{money(order.total)}</strong></p>
            </div>
          </section>

          <section className="rounded-2xl border border-taupe-200 bg-white p-5">
            <h2 className="mb-3 font-bold text-taupe-900">Order Status History</h2>
            {history.length ? (
              <ol className="grid gap-3 text-sm">
                {history.map((entry, index) => (
                  <li key={index} className="border-l-2 border-primary pl-3">
                    <p className="font-semibold capitalize">{readableStatus(entry.new_status)}</p>
                    <p className="text-xs text-taupe-600">
                      {new Date(entry.created_at).toLocaleString()}
                      {entry.changed_by ? ` · by ${entry.changed_by}` : ''}
                    </p>
                  </li>
                ))}
              </ol>
            ) : <p className="text-sm text-taupe-600">No recorded status changes.</p>}
          </section>
          <CourierAssignment order={order} items={items} onOrderStatusChanged={refreshOrderDetails} />
        </div>

        <aside className="grid content-start gap-5">
          <CustomerRiskCard orderId={order.id} />
          <section className="rounded-2xl border border-taupe-200 bg-white p-5">
            <h2 className="font-bold text-taupe-900">Current Status</h2>
            <p className="mt-2 text-sm font-bold uppercase text-primary-deep">{readableStatus(order.status)}</p>
            <p className="mt-3 text-xs text-taupe-600">Placed {new Date(order.created_at).toLocaleString()}</p>
          </section>

          <section className="rounded-2xl border border-taupe-200 bg-white p-5">
            <h2 className="font-bold text-taupe-900">Customer Order History</h2>
            <p className="mt-2 text-xs text-taupe-600">Verified by the same full phone number (admin only)</p>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-wash p-2"><strong className="block">{customerHistory.totalOrders}</strong><span className="text-[11px]">Total</span></div>
              <div className="rounded-lg bg-wash p-2"><strong className="block">{customerHistory.deliveredOrders}</strong><span className="text-[11px]">Delivered</span></div>
              <div className="rounded-lg bg-wash p-2"><strong className="block">{customerHistory.cancelledOrders}</strong><span className="text-[11px]">Cancelled</span></div>
            </div>
            <Link
              href={`/admin/orders?search=${encodeURIComponent(order.guest_phone)}`}
              className="mt-4 inline-block text-sm font-semibold text-primary-deep underline"
            >
              Search all orders from this number
            </Link>
            <div className="mt-4 grid gap-2 border-t border-taupe-200 pt-3">
              {customerHistory.recentOrders.map((previous) => (
                <Link
                  key={previous.id}
                  href={`/admin/orders/${previous.id}`}
                  className="flex items-center justify-between gap-2 rounded-lg px-1 py-2 text-xs hover:bg-wash"
                >
                  <span className="font-mono">{previous.order_no}</span>
                  <span className="capitalize text-taupe-600">{readableStatus(previous.status)}</span>
                </Link>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
