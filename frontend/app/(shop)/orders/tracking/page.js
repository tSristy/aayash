'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import Button from '@/components/ui/Button';
import Field, { inputCls } from '@/components/ui/Field';
import { Section, PageTitle } from '@/components/ui/Section';
import { API } from '@/lib/api';
import { money } from '@/lib/format';
import CopyIconButton from '@/components/ui/CopyIconButton';

const sharpInput = `${inputCls} !rounded-none !border-[#E2D9CE] !bg-white focus:!border-[#A65A3E]`;

const STEPS = [
  { key: 'placed', label: 'Order Placed' },
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'packed', label: 'Packed' },
  { key: 'out_for_delivery', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
];

export default function OrderTrackingPage() {
  const [orderNo, setOrderNo] = useState('');
  const [order, setOrder] = useState(null);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const [error, setError] = useState('');
  const [copyMessage, setCopyMessage] = useState('');

  useEffect(() => {
    try {
      const last = JSON.parse(sessionStorage.getItem('aem-last-tracking') || 'null');

      if (last) {
        setOrderNo(last.orderNo || '');
      }
    } catch {
      // Previous checkout details are optional, not a prerequisite to track.
    }
  }, []);

  async function searchOrder(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setOrder(null);
    setSearched(true);

    try {
      const response = await fetch(`${API}/api/orders/track`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({ orderNo: orderNo.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Could not locate your order.');
      }

      setOrder(data);
    } catch (reason) {
      setError(reason.message === 'Failed to fetch'
        ? 'Tracking service is unavailable right now.'
        : reason.message);
    } finally {
      setBusy(false);
    }
  }



  const currentStep = STEPS.findIndex((step) => step.key === order?.status);

  return (
    <Section className="pt-8">
      <nav className="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-stone-500">
        <Link href="/" className="hover:text-[#A65A3E]">Home</Link>
        <span>/</span>
        <span>Order Tracking</span>
      </nav>
      <PageTitle className="!font-serif !font-normal !text-[#2E261F]">
        Track your order
      </PageTitle>
      <p className="mt-2 max-w-[56ch] text-sm text-stone-600">
        Enter the order number you received after checkout. No login or
        private code is needed. Personal details are masked for privacy.
      </p>

      <form
        onSubmit={searchOrder}
        className="mt-6 grid max-w-[520px] gap-4 border border-[#E2D9CE] bg-[#F5F1EB] p-6 sm:p-8"
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#A65A3E]">
            Secure Order Lookup
          </p>
          <h2 className="mt-1 font-serif text-xl font-normal text-[#2E261F]">
            Find your order
          </h2>
        </div>
        <Field label="Order number">
          <input
            required
            value={orderNo}
            onChange={(event) => setOrderNo(event.target.value)}
            placeholder="AY-7Q2C-9D5K-M8PW"
            autoComplete="off"
            className={sharpInput}
          />
        </Field>
        {error && (
          <p role="alert" className="border border-[#A65A3E]/40 bg-white px-4 py-3 text-sm text-[#2E261F]">
            {error}
          </p>
        )}
        <Button
          size="lg"
          disabled={busy}
          className="!rounded-none !border-none !bg-[#A65A3E] !px-8 !py-3.5 !text-xs !font-semibold !uppercase !tracking-[0.2em] !text-white"
        >
          {busy ? 'Searching…' : 'Track order →'}
        </Button>
      </form>

      {searched && !busy && !error && !order && (
        <p className="mt-8 text-sm text-stone-600">No matching order found.</p>
      )}

      {order && (
        <div className="mt-8 grid max-w-[820px] gap-5 border border-[#E2D9CE] bg-white p-6 sm:p-8">
          <div className="flex items-center justify-between border-b border-[#E2D9CE] pb-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-stone-500">Order number</p>
              <h3 className="font-serif text-xl text-[#2E261F]">{order.order_no}</h3>
              <CopyIconButton
                value={orderNo.trim()}
                label="Copy order number"
                className="mt-2 !rounded-none text-[#A65A3E]"
                onResult={(ok) => setCopyMessage(ok ? 'Order number copied.' : 'Select the order number to copy it.')}
              />
              {copyMessage && <p role="status" className="mt-1 text-xs text-stone-600">{copyMessage}</p>}
            </div>
            <strong className="text-sm uppercase text-[#A65A3E]">
              {order.status.replace(/_/g, ' ')}
            </strong>
          </div>

          {order.courier && (
            <div className="border border-[#E2D9CE] bg-[#F5F1EB] p-4">
              <p className="text-xs uppercase tracking-wider text-stone-500">Courier Delivery</p>
              <p className="mt-1 text-sm font-semibold text-[#2E261F]">{order.courier.provider}</p>
              <p className="mt-1 text-sm capitalize text-stone-600">
                Parcel status: {order.courier.status.replace(/_/g, ' ')}
              </p>
            </div>
          )}

          <div className="grid gap-1 text-sm text-stone-600 sm:grid-cols-2">
            <p>Customer: <strong>{order.customer_name_masked}</strong></p>
            <p>Mobile: <strong>{order.customer_phone_masked}</strong></p>
          </div>

          {order.status === 'cancelled' ? (
            <p className="border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              This order has been cancelled.
            </p>
          ) : (
            <div className="grid grid-cols-5 gap-2">
              {STEPS.map((step, index) => (
                <div key={step.key} className="text-center">
                  <div className={`mb-2 h-1.5 ${index <= currentStep ? 'bg-[#A65A3E]' : 'bg-[#E2D9CE]'}`} />
                  <span className="text-[11px] text-stone-600">{step.label}</span>
                </div>
              ))}
            </div>
          )}

          <div className="border-y border-[#E2D9CE] py-3">
            <p className="mb-2 text-xs uppercase tracking-wider text-stone-500">Items ordered</p>
            {(order.items || []).map((item, index) => (
              <div key={index} className="flex justify-between gap-4 py-2 text-sm">
                <span>{item.name} ({item.variant_label}) × {item.qty}</span>
                <span>{money(item.line_total)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between text-sm">
            <span>Delivery: {money(order.delivery_fee)}</span>
            <strong className="text-[#A65A3E]">Total: {money(order.total)}</strong>
          </div>
        </div>
      )}

      <p className="mt-5 max-w-[56ch] text-xs text-stone-500">
        Older orders with the previous AEM reference format are not enabled
        for number-only lookup. Please contact Ayashmart support about them.
      </p>
    </Section>
  );
}
