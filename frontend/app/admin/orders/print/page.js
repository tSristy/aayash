'use client';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFetch } from '@/lib/admin-api';
import { taka, fmtDateTime } from '@/lib/format';
import { Alert, Btn, Spinner } from '@/components/admin/ui/kit';

function Inner() {
  const ids = useSearchParams().get('ids') || '';
  const { data, error } = useFetch('/orders/invoices', { ids });
  if (error) return <Alert>{error}</Alert>;
  if (!data) return <Spinner />;
  const s = data.settings || {};
  return (
    <div>
      <div className="mb-4 flex items-center justify-between print:hidden"><h1 className="text-2xl font-bold">Invoices ({data.invoices.length})</h1><Btn icon="print" onClick={() => window.print()}>Print</Btn></div>
      <div className="grid gap-6 print:gap-0">
        {data.invoices.map(({ order, items }) => (
          <article key={order.id} className="break-after-page rounded-2xl bg-white p-8 shadow-card print:rounded-none print:p-4 print:shadow-none" style={{ pageBreakAfter: 'always' }}>
            <header className="flex items-start justify-between gap-4 border-b border-taupe-200 pb-4">
              <div>{s.logo_url ? <img src={s.logo_url} alt="" className="mb-2 h-12" /> : <img src="/logo.png" alt="" className="mb-2 h-12" />}
                <p className="text-lg font-bold">{s.site_name || 'Aayash E-Mart'}</p>
                <p className="whitespace-pre-line text-xs text-taupe-600">{s.invoice_address}</p>
                <p className="text-xs text-taupe-600">{[s.contact_phone, s.contact_email].filter(Boolean).join(' · ')}</p></div>
              <div className="text-right"><p className="text-2xl font-bold">INVOICE</p><p className="font-mono text-sm">{order.order_no}</p><p className="text-xs text-taupe-600">{fmtDateTime(order.created_at)}</p></div>
            </header>
            <section className="grid gap-4 py-4 text-sm sm:grid-cols-2">
              <div><p className="text-xs font-bold uppercase text-taupe-600">Bill to</p><p className="font-bold">{order.guest_name}</p><p>{order.guest_phone}</p><p>{order.address_line}{order.area ? `, ${order.area}` : ''}, {order.city}</p></div>
              <div className="sm:text-right"><p className="text-xs font-bold uppercase text-taupe-600">Payment</p><p>Cash on delivery</p><p className="text-xs capitalize text-taupe-600">Status: {order.status.replace(/_/g, ' ')}</p></div>
            </section>
            <table className="w-full text-sm">
              <thead><tr className="border-y border-taupe-200 text-left text-xs uppercase text-taupe-600"><th className="py-2">Item</th><th className="py-2 text-right">Price</th><th className="py-2 text-right">Qty</th><th className="py-2 text-right">Total</th></tr></thead>
              <tbody>{items.map((i) => <tr key={i.id} className="border-b border-taupe-100"><td className="py-2">{i.name} <span className="text-taupe-600">({i.variant_label})</span></td><td className="py-2 text-right">{taka(i.unit_price)}</td><td className="py-2 text-right">{i.qty}</td><td className="py-2 text-right">{taka(i.line_total)}</td></tr>)}</tbody>
            </table>
            <dl className="ml-auto mt-4 grid max-w-xs gap-1 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{taka(order.subtotal)}</dd></div>
              {Number(order.discount) > 0 && <div className="flex justify-between"><dt>Discount</dt><dd>− {taka(order.discount)}</dd></div>}
              <div className="flex justify-between"><dt>Delivery</dt><dd>{taka(order.delivery_fee)}</dd></div>
              <div className="flex justify-between border-t border-taupe-200 pt-2 text-base font-bold"><dt>Amount to pay</dt><dd>{taka(order.total)}</dd></div>
            </dl>
            <footer className="mt-8 border-t border-taupe-200 pt-3 text-center text-xs text-taupe-600">{s.invoice_footer || 'Thank you for shopping with us.'}</footer>
          </article>
        ))}
      </div>
    </div>
  );
}
export default function Page() { return <Suspense><Inner /></Suspense>; }
