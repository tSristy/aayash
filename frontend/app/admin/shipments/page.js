'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  CatalogLoadingRows,
  CatalogPagination,
} from '@/components/admin/catalog/CatalogListControls';
import CopyIconButton from '@/components/ui/CopyIconButton';
import Icon from '@/components/admin/Icon';
import { money } from '@/lib/format';

const inputClass = 'rounded-xl border border-taupe-200 bg-white px-3 py-2.5 text-sm text-taupe-900 focus:border-primary focus:outline-none';
const readable = (value) => String(value || '').replace(/_/g, ' ');

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [provider, setProvider] = useState('all');
  const [courierOptions, setCourierOptions] = useState([]);
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const selected = new URLSearchParams(window.location.search).get('provider');
    if (selected && /^[a-z][a-z0-9-]{1,39}$/.test(selected)) setProvider(selected);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function loadCourierOptions() {
      try {
        const response = await fetch('/api/admin/couriers/providers/options?scope=all', {
          credentials: 'same-origin',
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) return;
        const result = await response.json();
        if (!controller.signal.aborted) setCourierOptions(result.items || []);
      } catch (error) {
        // The shipments list can still load when courier options are unavailable.
      }
    }
    loadCourierOptions();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, provider, status]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadShipments() {
      setLoading(true);
      setError('');

      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (debouncedSearch) params.set('q', debouncedSearch);
      if (provider !== 'all') params.set('provider', provider);
      if (status !== 'all') params.set('status', status);

      try {
        const response = await fetch(`/api/admin/couriers/shipments?${params}`, {
          credentials: 'same-origin',
          cache: 'no-store',
          signal: controller.signal,
        });
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload.error || 'Could not load shipments.');
        }
        if (controller.signal.aborted) return;
        setShipments(payload.items || []);
        setTotal(payload.total || 0);
        setTotalPages(payload.totalPages || 1);
      } catch (reason) {
        if (reason.name !== 'AbortError') {
          setError(reason.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    loadShipments();
    return () => controller.abort();
  }, [page, limit, debouncedSearch, provider, status]);

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

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-taupe-900">Courier Shipments</h1>
          <p className="mt-1 text-sm text-taupe-600">
            Search parcel IDs and orders. Shipment status is managed from Order Details.
          </p>
        </div>
        <Link
          href="/admin/couriers"
          className="rounded-xl border border-taupe-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-wash"
        >
          Courier Settings
        </Link>
      </div>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      <section className="overflow-hidden rounded-2xl border border-taupe-200 bg-white">
        <div className="grid gap-3 border-b border-taupe-200 p-5 sm:grid-cols-[1fr_auto_auto]">
          <input
            type="search"
            className={inputClass}
            aria-label="Search shipments"
            placeholder="Search consignment, order or phone…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className={inputClass}
            aria-label="Courier filter"
            value={provider}
            onChange={(event) => setProvider(event.target.value)}
          >
            <option value="all">All couriers</option>
            {courierOptions.map((item) => (
              <option key={item.id} value={item.code}>{item.name}{item.is_archived ? ' (archived)' : ''}</option>
            ))}
          </select>
          <select
            className={inputClass}
            aria-label="Shipment status filter"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">All statuses</option>
            {['booked', 'picked_up', 'in_transit', 'delivered', 'returning', 'returned', 'cancelled'].map((value) => (
              <option key={value} value={value} className="capitalize">{readable(value)}</option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead className="bg-wash text-xs uppercase tracking-wider text-taupe-600">
              <tr>
                <th className="px-5 py-3">Parcel / Order</th>
                <th className="px-5 py-3">Courier</th>
                <th className="px-5 py-3">COD</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-taupe-200">
              {loading ? (
                <CatalogLoadingRows colSpan={5} />
              ) : shipments.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-taupe-600">No shipments found.</td></tr>
              ) : shipments.map((shipment) => (
                <tr key={shipment.id} className="hover:bg-wash/50">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-2">
                      <strong className="font-mono">{shipment.consignment_id}</strong>
                      <CopyIconButton
                        value={shipment.consignment_id}
                        label="Copy consignment ID"
                        className="!h-8 !w-8 text-taupe-700"
                      />
                    </div>
                    <span className="mt-1 block text-xs text-taupe-600">{shipment.order_no} · {shipment.guest_name}</span>
                  </td>
                  <td className="px-5 py-4">{shipment.courier_name}</td>
                  <td className="px-5 py-4">{money(shipment.cod_amount)}</td>
                  <td className="px-5 py-4 text-xs capitalize">{readable(shipment.status)}</td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/admin/orders/${shipment.order_id}`}
                      className="inline-flex items-center justify-center rounded-lg border border-taupe-200 p-2 text-taupe-700 hover:bg-wash"
                      aria-label={`View order ${shipment.order_no}`}
                      title="View order"
                    >
                      <Icon name="eye" size={18} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <CatalogPagination list={list} />
      </section>
    </div>
  );
}
