'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Icon from '@/components/admin/Icon';
import {
  CatalogLoadingRows,
  CatalogPagination,
} from '@/components/admin/catalog/CatalogListControls';

const filterClass = 'rounded-xl border border-taupe-200 bg-white px-3 py-2.5 text-sm text-taupe-900 focus:border-primary focus:outline-none';
const iconClass = 'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-taupe-200 text-taupe-700 hover:bg-wash disabled:opacity-50';

export default function CourierSettingsPage() {
  const [providers, setProviders] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, status]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProviders() {
      setLoading(true);
      setError('');
      const params = new URLSearchParams({ page: String(page), limit: String(limit) });
      if (debouncedSearch) params.set('q', debouncedSearch);
      if (status !== 'all') params.set('status', status);

      try {
        const response = await fetch(`/api/admin/couriers/providers?${params}`, {
          credentials: 'same-origin',
          cache: 'no-store',
          signal: controller.signal,
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || 'Could not load couriers.');
        if (controller.signal.aborted) return;
        setProviders(payload.items || []);
        setTotal(payload.total || 0);
        setTotalPages(payload.totalPages || 1);
      } catch (reason) {
        if (reason.name !== 'AbortError') setError(reason.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadProviders();
    return () => controller.abort();
  }, [debouncedSearch, status, page, limit, refreshIndex]);

  async function mutateProvider(provider, action, body) {
    if (action === 'archive' && !window.confirm(`Archive ${provider.name}? Existing shipments will be preserved.`)) return;
    if (action === 'restore' && !window.confirm(`Restore ${provider.name} as inactive?`)) return;
    setSavingId(provider.id);
    setMessage('');
    setError('');

    try {
      const isToggle = action === 'toggle';
      const response = await fetch(
        `/api/admin/couriers/providers/${provider.id}${isToggle ? '' : `/${action}`}`,
        {
          method: isToggle ? 'PATCH' : 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: isToggle ? JSON.stringify(body) : '{}',
        }
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || 'Could not update courier.');
      setMessage(`${provider.name} ${action === 'archive' ? 'archived' : action === 'restore' ? 'restored (inactive)' : 'updated'} successfully.`);
      setRefreshIndex((index) => index + 1);
    } catch (reason) {
      setError(reason.message);
    } finally {
      setSavingId(null);
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

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-taupe-900">Courier Management</h1>
          <p className="mt-1 text-sm text-taupe-600">
            Add and manage couriers. Manual bookings work now; API mode requires a verified integration.
          </p>
        </div>
        <Link
          href="/admin/couriers/new"
          className="inline-flex items-center gap-2 rounded-xl bg-taupe-900 px-4 py-2.5 text-sm font-bold text-white hover:opacity-90"
        >
          <span aria-hidden="true">+</span> Add Courier
        </Link>
      </div>

      <Link href="/admin/shipments" className="w-fit rounded-xl border border-taupe-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-wash">
        View All Shipments
      </Link>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
      {message && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}

      <section className="overflow-hidden rounded-2xl border border-taupe-200 bg-white">
        <div className="flex flex-wrap gap-3 border-b border-taupe-200 p-5">
          <input
            type="search"
            className={`${filterClass} min-w-[200px] flex-1`}
            placeholder="Search courier…"
            aria-label="Search couriers"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <select
            className={filterClass}
            aria-label="Courier status filter"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="archived">Archived</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-wash text-xs uppercase text-taupe-600">
              <tr>
                <th className="px-5 py-3">Courier Provider</th>
                <th className="px-5 py-3">Integration</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-taupe-200">
              {loading ? (
                <CatalogLoadingRows colSpan={4} />
              ) : providers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center">
                    <p className="font-semibold text-taupe-900">
                      {debouncedSearch || status !== 'all' ? 'No matching couriers.' : 'No couriers configured yet.'}
                    </p>
                    <p className="mt-2 text-sm text-taupe-600">
                      {debouncedSearch || status !== 'all'
                        ? 'Change your search or status filter.'
                        : 'Add only the courier companies your client chooses.'}
                    </p>
                    {!debouncedSearch && status === 'all' && (
                      <Link
                        href="/admin/couriers/new"
                        className="mt-4 inline-flex rounded-xl bg-taupe-900 px-4 py-2.5 text-sm font-semibold text-white"
                      >
                        + Add Courier
                      </Link>
                    )}
                  </td>
                </tr>
              ) : providers.map((provider) => (
                <tr key={provider.id} className="hover:bg-wash/50">
                  <td className="px-5 py-4">
                    <p className="font-semibold">{provider.name}</p>
                    <p className="mt-1 text-xs text-taupe-600">{provider.code}</p>
                  </td>
                  <td className="px-5 py-4 text-xs text-taupe-600">Manual booking · API not connected</td>
                  <td className="px-5 py-4">
                    {provider.is_archived ? (
                      <span className="text-xs text-taupe-600">Archived</span>
                    ) : (
                      <label className="inline-flex items-center gap-2 text-xs">
                        <input
                          type="checkbox"
                          checked={provider.is_active}
                          disabled={savingId === provider.id}
                          onChange={() => mutateProvider(provider, 'toggle', { is_active: !provider.is_active })}
                        />
                        {provider.is_active ? 'Active' : 'Inactive'}
                      </label>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link href={`/admin/couriers/${provider.id}`} className={iconClass} aria-label={`View ${provider.name}`} title="View Courier">
                        <Icon name="eye" size={17} />
                      </Link>
                      {!provider.is_archived && (
                        <Link href={`/admin/couriers/${provider.id}/edit`} className={iconClass} aria-label={`Edit ${provider.name}`} title="Edit Courier">
                          <Icon name="edit" size={17} />
                        </Link>
                      )}
                      <button
                        type="button"
                        className={iconClass}
                        disabled={savingId === provider.id}
                        aria-label={`${provider.is_archived ? 'Restore' : 'Archive'} ${provider.name}`}
                        title={provider.is_archived ? 'Restore courier' : 'Archive courier'}
                        onClick={() => mutateProvider(provider, provider.is_archived ? 'restore' : 'archive')}
                      >
                        <Icon name={provider.is_archived ? 'restore' : 'archive'} size={17} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <CatalogPagination list={list} />
      </section>

      <section className="rounded-2xl border border-taupe-200 bg-white p-5">
        <h2 className="font-semibold text-taupe-900">Future API integration</h2>
        <p className="mt-2 text-sm leading-relaxed text-taupe-600">
          Courier settings are stored in the database. API booking remains disabled until the corresponding
          provider adapter and secure server-side credentials have been implemented and tested.
          Existing courier records and historical shipments are never deleted by Archive.
        </p>
      </section>
    </div>
  );
}
