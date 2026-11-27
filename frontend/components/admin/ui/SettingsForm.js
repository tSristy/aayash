'use client';

import { useEffect, useState } from 'react';
import { put, useFetch } from '@/lib/admin-api';
import { Alert, Btn, Card, Input, Select, Spinner, Textarea, Toggle, useToast } from './kit';
import ImageField from './ImageField';

const isOn = (v) => v === '1' || v === 1 || v === true || v === 'true';

/**
 * sections: [{ title, description, fields: [{ key, label, type, options, help, placeholder, span }] }]
 * Reads /ops/settings and saves only these keys to `save` (e.g. /ops/settings/website).
 */
export default function SettingsForm({ sections, save, submitLabel = 'Save changes', extra, onSaved }) {
  const { data, loading, error, reload } = useFetch('/ops/settings');
  const toast = useToast();
  const [values, setValues] = useState({});
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => { if (data) setValues(data.values); }, [data]);
  if (loading && !data) return <Spinner />;
  if (error) return <Alert>{error}</Alert>;
  if (!data) return null;
  const set = (k, v) => setValues((s) => ({ ...s, [k]: v }));
  const keys = sections.flatMap((s) => s.fields.map((f) => f.key));

  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr('');
    try {
      const body = {};
      for (const k of keys) body[k] = typeof values[k] === 'boolean' ? (values[k] ? '1' : '0') : (values[k] ?? '');
      await put(save, body);
      toast('Settings saved'); reload(); onSaved?.();
    } catch (x) { setErr(x.message); } finally { setBusy(false); }
  }

  const render = (f) => {
    const v = values[f.key] ?? '';
    const wrap = f.span === 2 ? 'sm:col-span-2' : '';
    if (f.type === 'toggle') return <div key={f.key} className={wrap}><Toggle checked={isOn(v)} onChange={(x) => set(f.key, x ? '1' : '0')} label={f.label} help={f.help} /></div>;
    if (f.type === 'image') return <div key={f.key} className={wrap}><ImageField label={f.label} value={v} onChange={(x) => set(f.key, x)} help={f.help} /></div>;
    if (f.type === 'textarea') return <Textarea key={f.key} wrap={wrap} label={f.label} help={f.help} rows={f.rows || 3} value={v} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} />;
    if (f.type === 'select') {
      const options = f.optionsFrom === 'fonts' ? data.fonts.map((x) => ({ value: x, label: x })) : f.optionsFrom === 'accounts' ? data.accounts.map((a) => ({ value: String(a.id), label: a.name })) : f.options;
      return <Select key={f.key} wrap={wrap} label={f.label} help={f.help} options={options} placeholder={f.placeholder ?? '— default —'} value={v} onChange={(e) => set(f.key, e.target.value)} />;
    }
    if (f.type === 'color') return (
      <div key={f.key} className={`grid gap-1.5 ${wrap}`}>
        <span className="text-sm font-medium text-taupe-700">{f.label}</span>
        <div className="flex items-center gap-2"><input type="color" aria-label={f.label} value={/^#[0-9a-f]{6}$/i.test(v) ? v : '#FF9933'} onChange={(e) => set(f.key, e.target.value.toUpperCase())} className="h-11 w-14 cursor-pointer rounded-xl border border-taupe-200 bg-white p-1" />
          <input aria-label={`${f.label} hex`} value={v} onChange={(e) => set(f.key, e.target.value)} placeholder="#FF9933" className="w-32 rounded-xl border border-taupe-200 px-3 py-2.5 font-mono text-sm focus:border-primary focus:outline-none" /></div>
        {f.help && <p className="text-xs text-taupe-600">{f.help}</p>}
      </div>
    );
    return <Input key={f.key} wrap={wrap} label={f.label} help={f.help} type={f.type === 'password' ? 'password' : f.type || 'text'} value={v} onChange={(e) => set(f.key, e.target.value)} placeholder={f.placeholder} autoComplete="off" />;
  };

  return (
    <form onSubmit={submit} className="grid gap-5">
      {err && <Alert>{err}</Alert>}
      {sections.map((s) => (
        <Card key={s.title}>
          <h2 className="text-base font-bold">{s.title}</h2>
          {s.description && <p className="mb-4 mt-0.5 text-sm text-taupe-600">{s.description}</p>}
          <div className={`grid gap-4 sm:grid-cols-2 ${s.description ? '' : 'mt-4'}`}>{s.fields.map(render)}</div>
        </Card>
      ))}
      {extra}
      <div className="sticky bottom-3 z-10 flex justify-end"><Btn type="submit" size="lg" loading={busy} className="shadow-pop">{submitLabel}</Btn></div>
    </form>
  );
}
