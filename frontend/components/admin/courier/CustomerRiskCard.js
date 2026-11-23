'use client';

import { useState } from 'react';

export default function CustomerRiskCard({ orderId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function checkHistory() {
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`/api/admin/couriers/orders/${orderId}/risk`, {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error || 'Customer history lookup failed.');
      }
      setData(payload);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-2xl border border-taupe-200 bg-white p-5">
      <h2 className="font-bold text-taupe-900">Customer Delivery Review</h2>
      <p className="mt-2 text-xs leading-relaxed text-taupe-600">
        Internal Ayashmart orders only. External courier history is not connected.
        These counts are not proof of customer fraud.
      </p>
      <button
        type="button"
        onClick={checkHistory}
        disabled={loading}
        className="mt-3 rounded-xl border border-taupe-200 bg-wash px-4 py-2 text-sm font-semibold hover:bg-white"
      >
        {loading ? 'Checking…' : 'Check Customer History'}
      </button>
      {error && <p role="alert" className="mt-3 text-xs text-red-700">{error}</p>}
      {data && (
        <div className="mt-4 grid gap-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg bg-wash p-2">
              <strong className="block">{data.totalOrders}</strong>
              <span className="text-[11px]">Total</span>
            </div>
            <div className="rounded-lg bg-wash p-2">
              <strong className="block">{data.deliveredOrders}</strong>
              <span className="text-[11px]">Delivered</span>
            </div>
            <div className="rounded-lg bg-wash p-2">
              <strong className="block">{data.cancelledOrders}</strong>
              <span className="text-[11px]">Cancelled</span>
            </div>
          </div>
          <p className="text-sm text-taupe-800">
            Observed delivery rate:{' '}
            <strong>{data.observedDeliveryRate === null ? 'Not enough data' : `${data.observedDeliveryRate}%`}</strong>
          </p>
          <p className="text-xs text-taupe-600">
            Based on finished orders only. Cancelled may include seller-side reasons;
            review manually before making any decision.
          </p>
          <p className="rounded-lg bg-wash p-2 text-xs text-taupe-700">
            External checks: Not connected — unknown, not high risk.
          </p>
        </div>
      )}
    </section>
  );
}
