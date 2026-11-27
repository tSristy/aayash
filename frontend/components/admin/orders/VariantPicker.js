'use client';
import { useEffect, useRef, useState } from 'react';
import { api, useDebounced } from '@/lib/admin-api';
import { taka } from '@/lib/format';
import { I } from '../ui/kit';

/** Search products/SKUs/barcodes and pick a variant. onPick(variant). */
export default function VariantPicker({ onPick, placeholder = 'Search product, SKU or barcode…', autoFocus, sellable = true, excludeCombos = false, clearOnPick = true }) {
  const [q, setQ] = useState('');
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dq = useDebounced(q, 250);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h);
  }, []);
  useEffect(() => {
    if (!open) return undefined;
    let live = true; setLoading(true);
    api('/ops/variants', { query: { q: dq || undefined, sellable: sellable ? '1' : undefined, limit: 12 } })
      .then((d) => { if (live) setItems(excludeCombos ? d.items.filter((x) => !x.is_combo) : d.items); }).catch(() => {}).finally(() => live && setLoading(false));
    return () => { live = false; };
  }, [dq, open, sellable, excludeCombos]);
  const pick = (v) => { onPick(v); if (clearOnPick) setQ(''); setOpen(false); };
  return (
    <div className="relative" ref={ref}>
      <I name="search" size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-taupe" />
      <input value={q} autoFocus={autoFocus} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} placeholder={placeholder} aria-label="Search products"
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (items[0]) pick(items[0]); } }}
        className="w-full rounded-xl border border-taupe-200 bg-white py-2.5 pl-10 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25" />
      {open && (
        <ul className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-xl bg-white py-1 shadow-pop">
          {loading && !items.length && <li className="px-4 py-3 text-sm text-taupe-600">Searching…</li>}
          {!loading && !items.length && <li className="px-4 py-3 text-sm text-taupe-600">No product found.</li>}
          {items.map((v) => (
            <li key={v.id}>
              <button type="button" onClick={() => pick(v)} disabled={sellable && v.stock < 1} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-taupe-50 disabled:opacity-50">
                <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-taupe-100">{v.image_url ? <img src={v.image_url} alt="" className="h-full w-full object-cover" /> : <I name="box" size={18} className="text-taupe" />}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{v.name}</span><span className="block truncate text-xs text-taupe-600">{v.label} · {v.sku}{v.is_combo ? ' · combo' : ''}</span></span>
                <span className="shrink-0 text-right text-sm"><b>{taka(v.price)}</b><span className={`block text-xs ${v.stock < 1 ? (sellable ? 'text-danger' : 'text-amber-700') : 'text-taupe-600'}`}>{v.stock < 1 ? (sellable ? 'Out of stock' : 'No stock yet') : `${v.stock} in stock`}</span></span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
