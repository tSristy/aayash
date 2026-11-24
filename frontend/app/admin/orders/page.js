'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import Icon from '@/components/admin/Icon';
import CopyIconButton from '@/components/ui/CopyIconButton';
import {
  CatalogLoadingRows,
  CatalogPagination,
} from '@/components/admin/catalog/CatalogListControls';
import { money } from '@/lib/format';

const STATUS_OPTIONS = [
  { value: 'placed', label: 'Placed', badge: 'bg-amber-100 text-amber-800' },
  { value: 'confirmed', label: 'Confirmed', badge: 'bg-blue-100 text-blue-800' },
  { value: 'packed', label: 'Packed', badge: 'bg-indigo-100 text-indigo-800' },
  { value: 'out_for_delivery', label: 'Out for Delivery', badge: 'bg-purple-100 text-purple-800' },
  { value: 'delivered', label: 'Delivered', badge: 'bg-emerald-100 text-emerald-800' },
  { value: 'cancelled', label: 'Cancelled', badge: 'bg-red-100 text-red-800' },
];

const ALLOWED_NEXT_STATUS = {
  placed: ['confirmed', 'cancelled'],
  confirmed: ['packed', 'cancelled'],
  packed: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['delivered'],
  delivered: [],
  cancelled: [],
};

const inputClass = 'rounded-xl border border-taupe-200 bg-wash px-3 py-2.5 text-sm text-taupe-900 focus:border-primary focus:bg-white focus:outline-none';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [payment, setPayment] = useState('all');
  const [courier, setCourier] = useState('all');
  const [courierOptions, setCourierOptions] = useState([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusCounts, setStatusCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [updatingId, setUpdatingId] = useState(null);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function loadCouriers() {
      try {
        const response = await fetch('/api/admin/couriers/providers/options?scope=all', {
          credentials: 'same-origin',
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = await response.json();
        if (!controller.signal.aborted) setCourierOptions(data.items || []);
      } catch (error) {
        // Orders are still searchable when courier settings are temporarily unavailable.
      }
    }
    loadCouriers();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get('search');
    if (initial) {
      setSearch(initial);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status, payment, courier, from, to]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadOrders() {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });

      if (debouncedSearch) params.set('search', debouncedSearch);
      if (status !== 'all') params.set('status', status);
      if (payment !== 'all') params.set('payment', payment);
      if (courier !== 'all') params.set('courier', courier);
      if (from) params.set('from', from);
      if (to) params.set('to', to);

      try {
        const response = await fetch(`/api/admin/orders?${params}`, {
          credentials: 'same-origin',
          cache: 'no-store',
          signal: controller.signal,
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || 'Could not load orders.');
        }

        if (controller.signal.aborted) return;

        setOrders(payload.items || []);
        setTotal(payload.total || 0);
        setTotalPages(payload.totalPages || 1);
        setStatusCounts(payload.statusCounts || {});
      } catch (reason) {
        if (reason.name !== 'AbortError') {
          setError(reason.message || 'Order lookup failed.');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadOrders();
    return () => controller.abort();
  }, [page, limit, debouncedSearch, status, payment, courier, from, to, refreshIndex]);

  function chooseStatus(value) {
    setStatus(value);
    setPage(1);
  }

  async function updateStatus(orderId, nextStatus) {
    if (nextStatus === 'cancelled' && !window.confirm('Cancel this order and release reserved stock?')) {
      return;
    }

    setUpdatingId(orderId);
    setError('');

    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = await response.json();

      if (!response.ok) {
        throw new Error(payload.error || 'Could not update order.');
      }

      setMessage('Order status updated.');
      setRefreshIndex((value) => value + 1);
    } catch (reason) {
      setError(reason.message || 'Order update failed.');
    } finally {
      setUpdatingId(null);
    }
  }

  const list = {
    page,
    limit,
    total,
    totalPages,
    loading,
    setPage,
    changeLimit(value) {
      setLimit(Number(value));
      setPage(1);
    },
  };

  const totalForChips = Object.values(statusCounts).reduce((sum, n) => sum + Number(n), 0);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-taupe-900">Orders &amp; Tracking</h1>
          <p className="mt-1 text-sm text-taupe-600">
            Search and filter orders from the database, manage status and contact customers.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setRefreshIndex((value) => value + 1)}
          className="rounded-xl border border-taupe-200 bg-white px-4 py-2.5 text-sm font-bold hover:bg-wash"
        >
          Refresh
        </button>
      </div>

      <section className="grid gap-4 rounded-2xl border border-taupe-200 bg-white p-4">
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search order number, customer name or phone…"
          aria-label="Search orders"
          className={`w-full ${inputClass}`}
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => chooseStatus('all')}
            className={`rounded-xl px-3 py-2 text-xs font-bold ${status === 'all' ? 'bg-primary text-taupe-900' : 'bg-wash text-taupe-600'}`}
          >
            All ({totalForChips})
          </button>
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => chooseStatus(option.value)}
              className={`rounded-xl px-3 py-2 text-xs font-bold ${status === option.value ? 'bg-primary text-taupe-900' : 'bg-wash text-taupe-600'}`}
            >
              {option.label} ({statusCounts[option.value] || 0})
            </button>
          ))}
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <label className="grid gap-1 text-xs text-taupe-600">
            Payment Status
            <select className={inputClass} value={payment} onChange={(e) => setPayment(e.target.value)}>
              <option value="all">All payments</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
            </select>
          </label>
          <label className="grid gap-1 text-xs text-taupe-600">
            Courier
            <select className={inputClass} value={courier} onChange={(e) => setCourier(e.target.value)}>
              <option value="all">All couriers</option>
              <option value="unassigned">Not actively assigned</option>
              {courierOptions.map((item) => (
                <option key={item.id} value={item.code}>{item.name}{item.is_archived ? ' (archived)' : ''}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-xs text-taupe-600">
              From
              <input type="date" className={inputClass} value={from} onChange={(e) => setFrom(e.target.value)} />
            </label>
            <label className="grid gap-1 text-xs text-taupe-600">
              To
              <input type="date" className={inputClass} value={to} onChange={(e) => setTo(e.target.value)} />
            </label>
          </div>
        </div>
      </section>

      {error && (
        <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>
      )}
      {message && <p role="status" className="text-sm text-taupe-700">{message}</p>}

      <div className="overflow-hidden rounded-2xl border border-taupe-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-taupe-200 bg-wash text-xs font-bold uppercase tracking-wider text-taupe-600">
                <th className="px-5 py-3.5">Order</th>
                <th className="px-5 py-3.5">Customer &amp; Phone</th>
                <th className="px-5 py-3.5">Total</th>
                <th className="px-5 py-3.5">Courier</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-taupe-200">
              {loading ? (
                <CatalogLoadingRows colSpan={6} />
              ) : orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-taupe-600">No matching orders found.</td>
                </tr>
              ) : orders.map((order) => {
                const option = STATUS_OPTIONS.find((item) => item.value === order.status);
                const needsCourierBooking = order.status === 'packed' && !Boolean(order.has_active_shipment);
                return (
                  <tr key={order.id} className="hover:bg-wash/50">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-taupe-900">{order.order_no}</p>
                      <p className="mt-1 text-xs text-taupe-600">{new Date(order.created_at).toLocaleDateString()}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-semibold text-taupe-900">{order.guest_name}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <a
                          href={`tel:${String(order.guest_phone || '').replace(/[^0-9+]/g, '')}`}
                          className="text-primary-deep underline underline-offset-2"
                        >
                          {order.guest_phone}
                        </a>
                        <CopyIconButton
                          value={order.guest_phone}
                          label={`Copy ${order.guest_phone}`}
                          className="!h-8 !w-8 text-taupe-700"
                        />
                      </div>
                    </td>
                    <td className="px-5 py-4 font-bold">{money(order.total)}</td>
                    <td className="px-5 py-4 text-xs">
                      <p>{order.courier_name || 'Not assigned'}</p>
                      {needsCourierBooking && (
                        <Link
                          href={`/admin/orders/${order.id}#courier-shipment`}
                          className="mt-2 inline-flex items-center rounded-lg border border-primary/40 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary-deep hover:bg-primary/20"
                        >
                          Book Courier
                        </Link>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-block rounded-lg px-2.5 py-1 text-xs font-bold ${option?.badge || 'bg-wash'}`}>
                        {option?.label || order.status}
                      </span>
                      <select
                        aria-label={`Update status for ${order.order_no}`}
                        className="mt-2 block rounded-lg border border-taupe-200 bg-white p-1.5 text-xs"
                        value={order.status}
                        disabled={updatingId === order.id}
                        onChange={(event) => updateStatus(order.id, event.target.value)}
                      >
                        {STATUS_OPTIONS.filter((item) => (
                          item.value === order.status || (
                            ALLOWED_NEXT_STATUS[order.status]?.includes(item.value) &&
                            !(item.value === 'out_for_delivery' && needsCourierBooking)
                          )
                        )).map((item) => (
                          <option key={item.value} value={item.value}>{item.label}</option>
                        ))}
                      </select>
                      {needsCourierBooking && (
                        <p className="mt-1 max-w-44 text-xs leading-relaxed text-amber-800">
                          Record a shipment before dispatch.
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/admin/orders/${order.id}`}
                        aria-label={`View order ${order.order_no}`}
                        title="View order details"
                        className="inline-flex items-center justify-center rounded-lg border border-taupe-200 p-2 hover:bg-wash"
                      >
                        <Icon name="eye" size={18} />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <CatalogPagination list={list} />
      </div>
    </div>
  );
}
