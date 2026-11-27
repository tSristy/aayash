'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

export default function CourierDetailPage() {
  const { id } = useParams();
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      try {
        const response = await fetch(`/api/admin/couriers/providers/${id}`, {
          credentials: 'same-origin',
          cache: 'no-store',
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Courier not found.');
        if (!controller.signal.aborted) setProvider(data);
      } catch (reason) {
        if (reason.name !== 'AbortError') setError(reason.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [id]);

  if (loading) return <p className="p-8 text-sm text-taupe-600">Loading courier…</p>;
  if (error || !provider) return <p role="alert" className="rounded-xl bg-red-50 p-5 text-red-700">{error || 'Courier unavailable.'}</p>;

  const details = [
    ['Courier Name', provider.name],
    ['Courier Code', provider.code],
    ['Mode', 'Manual · API not connected'],
    ['Status', provider.is_archived ? 'Archived' : provider.is_active ? 'Active' : 'Inactive'],
    ['Contact Number', provider.contact_phone || 'Not provided'],
    ['Official Website', provider.website_url || 'Not provided'],
    ['Tracking URL Template', provider.tracking_url_template || 'Not provided'],
    ['Notes', provider.notes || '—'],
  ];

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link href="/admin/couriers" className="text-sm font-semibold text-primary-deep hover:underline">← Back to Couriers</Link>
          <h1 className="mt-2 text-2xl font-bold text-taupe-900">Courier Details</h1>
          <p className="mt-1 text-sm text-taupe-600">Provider settings and manual booking availability</p>
        </div>
        {!provider.is_archived && (
          <Link href={`/admin/couriers/${provider.id}/edit`} className="rounded-xl bg-taupe-900 px-4 py-2.5 text-sm font-bold text-white">Edit Courier</Link>
        )}
      </div>
      <section className="grid max-w-3xl gap-2 rounded-2xl border border-taupe-200 bg-white p-5">
        {details.map(([label, value]) => (
          <div key={label} className="grid gap-1 border-b border-taupe-200 py-3 last:border-b-0 sm:grid-cols-[190px_1fr]">
            <span className="text-xs font-medium text-taupe-600">{label}</span>
            <span className="break-words text-sm font-semibold text-taupe-900">{value}</span>
          </div>
        ))}
      </section>
      <Link href={`/admin/shipments?provider=${encodeURIComponent(provider.code)}`} className="w-fit rounded-xl border border-taupe-200 bg-white px-4 py-2.5 text-sm font-semibold hover:bg-wash">
        View this courier's shipments
      </Link>
    </div>
  );
}
