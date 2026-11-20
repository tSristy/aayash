'use client';
import { useMemo, useState } from 'react';
import Icon from './Icon';
import { ORDERS, STATUS } from './data';
import { money } from '@/lib/format';

export default function RecentOrders() {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return ORDERS.filter((o) => (status === 'all' || o.status === status)
      && (!needle || `${o.id} ${o.customer} ${o.items}`.toLowerCase().includes(needle)));
  }, [q, status]);

  return (
    <section className="rounded-card border border-taupe-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 p-5">
        <h2 className="text-lg">Recent orders</h2>
        <div className="flex flex-wrap gap-2">
          <label className="flex items-center gap-2 rounded-xl border border-taupe-200 bg-white px-3 focus-within:border-primary">
            <Icon name="search" size={16} className="text-taupe-600" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search orders"
              aria-label="Search orders" className="w-40 bg-transparent py-2 text-sm focus:outline-none" />
          </label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"
            className="rounded-xl border border-taupe-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none">
            <option value="all">All status</option>
            {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-y border-taupe-200 bg-taupe-50 text-taupe-600">
              {['Order', 'Customer', 'Date', 'Amount', 'Status'].map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="border-b border-taupe-200 last:border-0 hover:bg-taupe-50">
                <td className="whitespace-nowrap px-5 py-3.5 font-bold">{o.id}</td>
                <td className="px-5 py-3.5">
                  <p className="whitespace-nowrap font-medium">{o.customer}</p>
                  <p className="max-w-[220px] truncate text-xs text-taupe-600">{o.items}</p>
                </td>
                <td className="whitespace-nowrap px-5 py-3.5 text-taupe-600">{o.date}</td>
                <td className="px-5 py-3.5 font-bold">{money(o.amount)}</td>
                <td className="px-5 py-3.5"><span className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-bold ${STATUS[o.status].cls}`}>{STATUS[o.status].label}</span></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="px-5 py-10 text-center text-taupe-600">No orders match your search.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}
