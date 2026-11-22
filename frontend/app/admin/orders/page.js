'use client';

import { useEffect, useState, useMemo } from 'react';
import Icon from '@/components/admin/Icon';
import { API } from '@/lib/api';
import { money } from '@/lib/format';

const STATUS_OPTIONS = [
  { value: 'placed', label: 'Placed', badge: 'bg-amber-100 text-amber-800' },
  { value: 'confirmed', label: 'Confirmed', badge: 'bg-blue-100 text-blue-800' },
  { value: 'packed', label: 'Packed', badge: 'bg-indigo-100 text-indigo-800' },
  { value: 'out_for_delivery', label: 'Out for Delivery', badge: 'bg-purple-100 text-purple-800' },
  { value: 'delivered', label: 'Delivered', badge: 'bg-emerald-100 text-emerald-800' },
  { value: 'cancelled', label: 'Cancelled', badge: 'bg-red-100 text-red-800' },
];

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [queryText, setQueryText] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [updatingId, setUpdatingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);

  const loadOrders = async () => {
    setLoading(true);
    setError('');
    try {
     const res = await fetch(`${API}/api/admin/orders`);
      const text = await res.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        throw new Error('Admin orders endpoint (GET /api/admin/orders) is not available on the backend yet.');
      }
      if (!res.ok) throw new Error(data.error || 'Failed to load orders.');
      setOrders(Array.isArray(data) ? data : data.orders || []);
    } catch (err) {
      setError(
        err.message === 'Failed to fetch'
          ? 'Cannot reach the server. Check that the backend is running.'
          : err.message
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  const updateStatus = async (orderId, newStatus) => {
    setUpdatingId(orderId);
    setError('');
    try {
   const res = await fetch(`${API}/api/admin/orders/${orderId}/status`, {
  method: 'PATCH',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ status: newStatus }),
});
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not update order status.');

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = useMemo(() => {
    const q = queryText.trim().toLowerCase();
    return orders.filter((o) => {
      const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
      const matchesQuery =
        !q ||
        String(o.order_no || '').toLowerCase().includes(q) ||
        String(o.guest_name || '').toLowerCase().includes(q) ||
        String(o.guest_phone || '').toLowerCase().includes(q);
      return matchesStatus && matchesQuery;
    });
  }, [orders, queryText, statusFilter]);

  const getBadge = (status) => {
    const found = STATUS_OPTIONS.find((s) => s.value === status);
    return found ? found.badge : 'bg-taupe-100 text-taupe-800';
  };

  return (
    <div className="grid gap-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-taupe-900">Orders &amp; Tracking</h1>
          <p className="mt-1 text-sm text-taupe-600">
            View all customer orders and update live delivery tracking statuses.
          </p>
        </div>
        <button
          type="button"
          onClick={loadOrders}
          disabled={loading}
          className="rounded-xl border border-taupe-200 bg-white px-4 py-2.5 text-sm font-bold text-taupe-900 transition-colors hover:bg-wash"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Search & Status Filters */}
      <div className="grid gap-4 rounded-2xl border border-taupe-200 bg-white p-4 sm:grid-cols-[1fr_auto]">
        <div className="relative">
          <input
            type="text"
            value={queryText}
            onChange={(e) => setQueryText(e.target.value)}
            placeholder="Search by order no, customer name, or phone…"
            className="w-full rounded-xl border border-taupe-200 bg-wash px-4 py-2.5 text-sm text-taupe-900 placeholder:text-taupe/70 focus:border-primary focus:bg-white focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setStatusFilter('all')}
            className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
              statusFilter === 'all'
                ? 'bg-primary text-taupe-900'
                : 'bg-wash text-taupe-600 hover:text-taupe-900'
            }`}
          >
            All ({orders.length})
          </button>
          {STATUS_OPTIONS.map((st) => (
            <button
              key={st.value}
              type="button"
              onClick={() => setStatusFilter(st.value)}
              className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                statusFilter === st.value
                  ? 'bg-primary text-taupe-900'
                  : 'bg-wash text-taupe-600 hover:text-taupe-900'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      {/* Orders Table */}
      <div className="overflow-hidden rounded-2xl border border-taupe-200 bg-white">
        {loading ? (
          <p className="p-8 text-center text-sm text-taupe-600">Loading orders…</p>
        ) : filteredOrders.length === 0 ? (
          <p className="p-8 text-center text-sm text-taupe-600">No matching orders found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-taupe-200 bg-wash text-xs font-bold uppercase tracking-wider text-taupe-600">
                  <th className="px-5 py-3.5">Order</th>
                  <th className="px-5 py-3.5">Customer</th>
                  <th className="px-5 py-3.5">Address</th>
                  <th className="px-5 py-3.5">Total</th>
                  <th className="px-5 py-3.5">Tracking Status</th>
                  <th className="px-5 py-3.5 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-taupe-200">
                {filteredOrders.map((order) => {
                  const isExpanded = expandedId === order.id;
                  return (
                    <>
                      <tr key={order.id} className="hover:bg-wash/50">
                        <td className="px-5 py-4">
                          <p className="font-bold text-taupe-900">{order.order_no}</p>
                          {order.created_at && (
                            <p className="text-xs text-taupe-600">
                              {new Date(order.created_at).toLocaleDateString()}
                            </p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-taupe-900">{order.guest_name}</p>
                          <p className="text-xs text-taupe-600">{order.guest_phone}</p>
                        </td>
                        <td className="max-w-[220px] px-5 py-4 text-xs text-taupe-700">
                          {order.address_line}
                          {order.area ? `, ${order.area}` : ''}
                          {order.city ? `, ${order.city}` : ''}
                        </td>
                        <td className="px-5 py-4 font-bold text-taupe-900">
                          {money(order.total)}
                          <span className="block text-[11px] font-normal uppercase text-taupe-600">
                            {order.payment_method || 'cod'}
                          </span>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-block rounded-lg px-2.5 py-1 text-xs font-bold ${getBadge(
                                order.status
                              )}`}
                            >
                              {STATUS_OPTIONS.find((s) => s.value === order.status)?.label ||
                                order.status}
                            </span>
                            <select
                              aria-label={`Change status for ${order.order_no}`}
                              disabled={updatingId === order.id}
                              value={order.status || 'placed'}
                              onChange={(e) => updateStatus(order.id, e.target.value)}
                              className="rounded-lg border border-taupe-200 bg-white px-2.5 py-1 text-xs font-semibold text-taupe-900 focus:border-primary focus:outline-none"
                            >
                              {STATUS_OPTIONS.map((st) => (
                                <option key={st.value} value={st.value}>
                                  {st.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : order.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-taupe-200 px-3 py-1.5 text-xs font-bold text-taupe-900 hover:bg-wash"
                          >
                            {isExpanded ? 'Hide' : 'Items'}
                          </button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr key={`${order.id}-details`} className="bg-wash/60">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="grid gap-2 text-xs text-taupe-800">
                              <p className="font-bold uppercase tracking-wider text-taupe-600">
                                Ordered Items
                              </p>
                              {Array.isArray(order.items) && order.items.length > 0 ? (
                                <ul className="divide-y divide-taupe-200 rounded-xl border border-taupe-200 bg-white px-4">
                                  {order.items.map((item, idx) => (
                                    <li
                                      key={item.id || idx}
                                      className="flex justify-between py-2.5 text-sm"
                                    >
                                      <span>
                                        {item.name}{' '}
                                        {item.variant_label ? `(${item.variant_label})` : ''} ×{' '}
                                        {item.qty}
                                      </span>
                                      <span className="font-bold">{money(item.line_total)}</span>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-taupe-600">No item details returned.</p>
                              )}
                              {order.note && (
                                <p className="mt-1">
                                  <strong>Note:</strong> {order.note}
                                </p>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}