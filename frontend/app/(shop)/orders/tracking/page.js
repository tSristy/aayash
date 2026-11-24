'use client';

import Link from 'next/link';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Button from '@/components/ui/Button';
import Field, { inputCls } from '@/components/ui/Field';
import { Section, PageTitle } from '@/components/ui/Section';
import { API } from '@/lib/api';
import { money } from '@/lib/format';

const sharpInput = `${inputCls} !rounded-none !border-[#E2D9CE] !bg-white focus:!border-[#A65A3E]`;

const STEPS = [
  { key: 'placed', label: 'Order Placed', desc: 'We have received your order.' },
  { key: 'confirmed', label: 'Confirmed', desc: 'Your order has been verified.' },
  { key: 'packed', label: 'Packed', desc: 'Your items are packed and ready.' },
  { key: 'out_for_delivery', label: 'Out for Delivery', desc: 'Our rider is on the way.' },
  { key: 'delivered', label: 'Delivered', desc: 'Order delivered successfully.' },
];

function TrackingContent() {
  const searchParams = useSearchParams();
  const initialPhone = searchParams.get('phone') || '';

  const [phone, setPhone] = useState(initialPhone);
  const [orders, setOrders] = useState([]);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');

  const searchOrders = async (phoneQuery) => {
    const cleanPhone = (phoneQuery ?? phone).trim();
    if (!cleanPhone) {
      setError('Please enter your phone number.');
      return;
    }

    setBusy(true);
    setError('');
    setSearched(true);

    try {
      const res = await fetch(`${API}/api/orders?phone=${encodeURIComponent(cleanPhone)}`);
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Order tracking service is currently unavailable. Please try again shortly.');
      }

      if (!res.ok) throw new Error(data.error || 'Could not load order details.');

      const list = Array.isArray(data) ? data : data.orders || [];
      setOrders(list);
    } catch (err) {
      setOrders([]);
      setError(
        err.message === 'Failed to fetch'
          ? 'Cannot reach the server. Check that the backend is running.'
          : err.message
      );
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (initialPhone) {
      setPhone(initialPhone);
      searchOrders(initialPhone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPhone]);

  const handleSubmit = (e) => {
    e.preventDefault();
    searchOrders(phone);
  };

  const getStepIndex = (status) => {
    const idx = STEPS.findIndex((s) => s.key === status);
    return idx === -1 ? 0 : idx;
  };

  return (
    <Section className="pt-8">
      <nav
        className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-stone-500"
        aria-label="Breadcrumb"
      >
        <Link href="/" className="hover:text-[#A65A3E]">Home</Link>
        <span>/</span>
        <span className="text-[#2E261F]">Order Tracking</span>
      </nav>

      <PageTitle className="!font-serif !font-normal !text-[#2E261F]">Track your order</PageTitle>
      <p className="mt-2 max-w-[56ch] text-sm text-stone-600">
        Enter the phone number used during checkout to view your order status and order history.
      </p>

      {/* Tracking Form */}
      <form
        onSubmit={handleSubmit}
        className="mt-6 grid max-w-[520px] gap-4 border border-[#E2D9CE] bg-[#F5F1EB] p-6 sm:p-8"
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#A65A3E]">
            Order Lookup
          </p>
          <h2 className="mt-1 font-serif text-xl font-normal text-[#2E261F]">
            Find your order
          </h2>
        </div>

        <Field label="Phone number">
          <input
            required
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="e.g. 01712345678"
            autoComplete="tel"
            className={sharpInput}
          />
        </Field>

        {error && (
          <div role="alert" className="border border-[#A65A3E]/40 bg-white px-4 py-3 text-sm text-[#2E261F]">
            {error}
          </div>
        )}

        <div>
          <Button
            size="lg"
            disabled={busy}
            className="!rounded-none !border-none !bg-[#A65A3E] !px-8 !py-3.5 !text-xs !font-semibold !uppercase !tracking-[0.2em] !text-white hover:!bg-[#8F4B32]"
          >
            {busy ? 'Searching…' : 'Track order →'}
          </Button>
        </div>
      </form>

      {/* Empty Result */}
      {searched && !busy && !error && orders.length === 0 && (
        <div className="mt-8 max-w-[520px] border border-[#E2D9CE] bg-[#F5F1EB] p-8 text-center">
          <p className="font-serif text-xl text-[#2E261F]">
            No orders found for &ldquo;{phone}&rdquo;
          </p>
          <p className="mt-1.5 text-sm text-stone-600">
            Please double-check your phone number or{' '}
            <Link href="/products" className="font-semibold text-[#A65A3E] underline">
              browse products
            </Link>
            .
          </p>
        </div>
      )}

      {/* Results List */}
      {orders.length > 0 && (
        <div className="mt-8 grid max-w-[820px] gap-6">
          {orders.map((order) => {
            const isCancelled = order.status === 'cancelled';
            const currentStep = getStepIndex(order.status);

            return (
              <div
                key={order.id}
                className="border border-[#E2D9CE] bg-white p-6 sm:p-8"
              >
                {/* Order Header */}
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E2D9CE] pb-4">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-stone-500">
                      Order Number
                    </p>
                    <h3 className="mt-0.5 font-serif text-xl font-medium text-[#2E261F]">
                      {order.order_no}
                    </h3>
                    {order.created_at && (
                      <p className="mt-1 text-xs text-stone-500">
                        Placed on {new Date(order.created_at).toLocaleString()}
                      </p>
                    )}
                  </div>

                  <span
                    className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                      isCancelled
                        ? 'bg-red-100 text-red-800'
                        : order.status === 'delivered'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-[#F5F1EB] text-[#A65A3E]'
                    }`}
                  >
                    {String(order.status || 'placed').replace(/_/g, ' ')}
                  </span>
                </div>

                {/* Progress Stepper */}
                {isCancelled ? (
                  <p className="my-5 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                    This order has been cancelled.
                  </p>
                ) : (
                  <div className="my-6">
                    <div className="grid grid-cols-5 gap-2">
                      {STEPS.map((step, idx) => {
                        const done = idx <= currentStep;
                        return (
                          <div key={step.key} className="text-center">
                            <div
                              className={`mb-2 h-1.5 ${
                                done ? 'bg-[#A65A3E]' : 'bg-[#E2D9CE]'
                              }`}
                            />
                            <span
                              className={`block text-[11px] uppercase tracking-wider ${
                                done ? 'font-semibold text-[#2E261F]' : 'text-stone-400'
                              }`}
                            >
                              {step.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <p className="mt-3 text-center text-xs text-stone-600">
                      Status: <strong className="text-[#2E261F]">{STEPS[currentStep]?.label}</strong> —{' '}
                      {STEPS[currentStep]?.desc}
                    </p>
                  </div>
                )}

                {/* Delivery Details */}
                <div className="mb-5 grid gap-1 border border-[#E2D9CE] bg-[#F5F1EB] p-4 text-sm text-stone-700">
                  <p>
                    <strong className="text-[#2E261F]">Recipient:</strong> {order.guest_name} ({order.guest_phone})
                  </p>
                  <p>
                    <strong className="text-[#2E261F]">Address:</strong> {order.address_line}
                    {order.area ? `, ${order.area}` : ''}
                    {order.city ? `, ${order.city}` : ''}
                  </p>
                  <p>
                    <strong className="text-[#2E261F]">Payment:</strong>{' '}
                    {String(order.payment_method || 'cod').toUpperCase()}
                  </p>
                </div>

                {/* Items */}
                {Array.isArray(order.items) && order.items.length > 0 && (
                  <div className="mb-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-stone-500">
                      Items Ordered
                    </p>
                    <div className="divide-y divide-[#E2D9CE] border-y border-[#E2D9CE]">
                      {order.items.map((item, idx) => (
                        <div
                          key={item.id || idx}
                          className="flex justify-between py-2.5 text-sm text-stone-700"
                        >
                          <span>
                            {item.name} {item.variant_label ? `(${item.variant_label})` : ''} × {item.qty}
                          </span>
                          <span className="font-medium text-[#2E261F]">{money(item.line_total)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Totals */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 text-sm">
                  <span className="text-stone-500">
                    Delivery: {Number(order.delivery_fee) > 0 ? money(order.delivery_fee) : 'Free'}
                    {Number(order.discount) > 0 ? ` · Discount: -${money(order.discount)}` : ''}
                  </span>
                  <span className="text-base font-semibold text-[#A65A3E]">
                    Total: {money(order.total)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
}

export default function OrderTrackingPage() {
  return (
    <Suspense fallback={<Section className="pt-8"><p className="text-sm text-stone-500">Loading tracker…</p></Section>}>
      <TrackingContent />
    </Suspense>
  );
}