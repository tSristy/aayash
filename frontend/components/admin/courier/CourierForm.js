'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

const inputClass = 'w-full rounded-xl border border-taupe-200 bg-wash px-3 py-2.5 text-sm focus:border-primary focus:bg-white focus:outline-none';

function emptyForm() {
  return {
    name: '',
    code: '',
    contact_phone: '',
    website_url: '',
    tracking_url_template: '',
    notes: '',
    is_active: true,
  };
}

export default function CourierForm({ mode = 'create' }) {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const editing = mode === 'edit';
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!editing || !id) return;
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch(`/api/admin/couriers/providers/${id}`, {
          credentials: 'same-origin',
          cache: 'no-store',
          signal: controller.signal,
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Unable to load courier.');
        if (data.is_archived) throw new Error('Restore this courier before editing.');
        if (!controller.signal.aborted) {
          setForm({
            name: data.name || '',
            code: data.code || '',
            contact_phone: data.contact_phone || '',
            website_url: data.website_url || '',
            tracking_url_template: data.tracking_url_template || '',
            notes: data.notes || '',
            is_active: Boolean(data.is_active),
          });
        }
      } catch (reason) {
        if (reason.name !== 'AbortError') setError(reason.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    load();
    return () => controller.abort();
  }, [editing, id]);

  function change(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        name: form.name,
        contact_phone: form.contact_phone,
        website_url: form.website_url,
        tracking_url_template: form.tracking_url_template,
        notes: form.notes,
        is_active: form.is_active,
      };
      if (!editing && form.code.trim()) payload.code = form.code.trim();
      const response = await fetch(
        editing ? `/api/admin/couriers/providers/${id}` : '/api/admin/couriers/providers',
        {
          method: editing ? 'PATCH' : 'POST',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not save courier.');
      router.push(`/admin/couriers/${data.id}`);
      router.refresh();
    } catch (reason) {
      setError(reason.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="p-8 text-sm text-taupe-600">Loading courier…</p>;
  }

  return (
    <div className="grid gap-6">
      <div>
        <Link href="/admin/couriers" className="text-sm font-semibold text-primary-deep hover:underline">← Back to Couriers</Link>
        <h1 className="mt-2 text-2xl font-bold text-taupe-900">{editing ? 'Edit Courier' : 'Add Courier'}</h1>
        <p className="mt-1 text-sm text-taupe-600">Manage manual courier details. No API credentials are required.</p>
      </div>

      {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}

      <form onSubmit={save} className="grid w-full max-w-5xl gap-5 rounded-2xl border border-taupe-200 bg-white p-5 sm:p-6">
        <div className="grid grid-cols-1 gap-x-5 gap-y-5 md:grid-cols-2">
          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="courier-name" className="flex min-h-5 items-center gap-1 text-sm font-semibold text-taupe-900">
              <span>Courier Name</span>
              <span className="text-red-600" aria-hidden="true">*</span>
              <span className="sr-only">(required)</span>
            </label>
            <input
              id="courier-name"
              className={inputClass}
              required
              maxLength={120}
              value={form.name}
              onChange={(event) => change('name', event.target.value)}
              placeholder="e.g. Sundarban Courier"
            />
            <p className="min-h-4 text-xs text-taupe-600">Courier name shown throughout Admin.</p>
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="courier-code" className="flex min-h-5 items-center text-sm font-semibold text-taupe-900">
              Courier Code {editing ? '(permanent)' : '(optional)'}
            </label>
            <input
              id="courier-code"
              className={inputClass}
              disabled={editing}
              value={form.code}
              maxLength={40}
              onChange={(event) => change('code', event.target.value.toLowerCase().replace(/\s+/g, '-'))}
              placeholder="Auto-generated if empty"
              pattern="[a-z][a-z0-9-]{1,39}"
              aria-describedby="courier-code-help"
            />
            <p id="courier-code-help" className="min-h-4 text-xs text-taupe-600">
              Used for integration/filtering; cannot be changed after creation.
            </p>
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="courier-phone" className="flex min-h-5 items-center text-sm font-semibold text-taupe-900">
              Contact Number
            </label>
            <input
              id="courier-phone"
              className={inputClass}
              value={form.contact_phone}
              maxLength={32}
              onChange={(event) => change('contact_phone', event.target.value)}
              placeholder="Courier support phone"
            />
          </div>

          <div className="flex min-w-0 flex-col gap-2">
            <label htmlFor="courier-website" className="flex min-h-5 items-center text-sm font-semibold text-taupe-900">
              Official Website (HTTPS)
            </label>
            <input
              id="courier-website"
              className={inputClass}
              type="url"
              value={form.website_url}
              maxLength={500}
              onChange={(event) => change('website_url', event.target.value)}
              placeholder="https://example.com"
            />
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor="courier-tracking-template" className="text-sm font-semibold text-taupe-900">
            Tracking Link Template (optional)
          </label>
          <input
            id="courier-tracking-template"
            className={inputClass}
            value={form.tracking_url_template}
            maxLength={500}
            onChange={(event) => change('tracking_url_template', event.target.value)}
            placeholder="https://example.com/track/{tracking_id}"
            aria-describedby="courier-tracking-help"
          />
          <p id="courier-tracking-help" className="text-xs text-taupe-600">
            Use {'{tracking_id}'} as the placeholder. Only use an official courier-provided link.
          </p>
        </div>

        <div className="flex min-w-0 flex-col gap-2">
          <label htmlFor="courier-notes" className="text-sm font-semibold text-taupe-900">Notes</label>
          <textarea
            id="courier-notes"
            className={inputClass}
            rows={3}
            value={form.notes}
            maxLength={500}
            onChange={(event) => change('notes', event.target.value)}
          />
        </div>
        <label className="inline-flex items-center gap-3 text-sm font-medium">
          <input type="checkbox" checked={form.is_active} onChange={(event) => change('is_active', event.target.checked)} />
          Active (available for new manual shipments)
        </label>
        <div className="rounded-xl bg-wash p-4 text-xs leading-relaxed text-taupe-600">
          Integration Mode: <strong>Manual</strong>. API Mode and credential entry will be available only after official provider integration is implemented and tested.
        </div>
        <div className="flex flex-wrap justify-end gap-3 border-t border-taupe-200 pt-4">
          <Link href="/admin/couriers" className="rounded-xl border border-taupe-200 px-5 py-2.5 text-sm font-semibold hover:bg-wash">Cancel</Link>
          <button type="submit" disabled={saving} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-taupe-900 disabled:opacity-50">
            {saving ? 'Saving…' : editing ? 'Update Courier' : 'Create Courier'}
          </button>
        </div>
      </form>
    </div>
  );
}
