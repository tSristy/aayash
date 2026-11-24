'use client';

import { useMemo, useState } from 'react';
import Icon from './Icon';
import { money } from '@/lib/format';

const STATUS = {
  placed: { label: 'Placed', cls: 'bg-taupe-100 text-taupe-700' },
  confirmed: { label: 'Confirmed', cls: 'bg-primary/15 text-primary-deep' },
  packed: { label: 'Packed', cls: 'bg-primary/15 text-primary-deep' },
  out_for_delivery: { label: 'Out for delivery', cls: 'bg-primary text-taupe-900' },
  delivered: { label: 'Delivered', cls: 'bg-success/10 text-success' },
  cancelled: { label: 'Cancelled', cls: 'bg-danger/10 text-danger' },
};

export default function RecentOrders({ orders = [] }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');

  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return orders.filter((order) => (
      (status === 'all' || order.status === status)
      && (!needle || `${order.id} ${order.customer} ${order.items}`.toLowerCase().includes(needle))
    ));
  }, [orders, query, status]);

  return (
    <section className="rounded-card border border-taupe-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5">
        <h2 className="text-lg">Recent orders</h2>
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-2 rounded-xl border border-taupe-200 bg-white px-3">
            <Icon name="search" size={16} className="text-taupe-600" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search recent orders"
              aria-label="Search recent orders"
              className="w-40 bg-transparent py-2 text-sm focus:outline-none"
            />
          </label>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            aria-label="Filter by status"
            className="rounded-xl border border-taupe-200 bg-white px-3 py-2 text-sm"
          >
            <option value="all">All status</option>
            {Object.entries(STATUS).map(([key, value]) => (
              <option value={key} key={key}>{value.label}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-y border-taupe-200 bg-taupe-50 text-taupe-600">
              {['Order', 'Customer', 'Date', 'Amount', 'Status'].map((heading) => (
                <th key={heading} className="px-5 py-3 font-medium">{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((order) => {
              const badge = STATUS[order.status] || STATUS.placed;

              return (
                <tr key={order.id} className="border-b border-taupe-200 last:border-0 hover:bg-taupe-50">
                  <td className="whitespace-nowrap px-5 py-3.5 font-bold">{order.id}</td>
                  <td className="px-5 py-3.5">
                    <p className="font-medium">{order.customer}</p>
                    <p className="max-w-[220px] truncate text-xs text-taupe-600">{order.items}</p>
                  </td>
                  <td className="px-5 py-3.5 text-taupe-600">
                    {new Date(order.date).toLocaleDateString()}
                  </td>
                  <td className="px-5 py-3.5 font-bold">{money(order.amount)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-taupe-600">
                  No recent orders match your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
