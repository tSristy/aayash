'use client';
import { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { Btn, Card, IconBtn, PageHeader, Select } from '@/components/admin/ui/kit';
import VariantPicker from '@/components/admin/orders/VariantPicker';
import { taka } from '@/lib/format';

function Barcode({ value }) {
  const ref = useRef(null);
  useEffect(() => { if (ref.current) { try { JsBarcode(ref.current, value, { format: 'CODE128', height: 38, width: 1.6, fontSize: 11, margin: 0, displayValue: true }); } catch { /* invalid */ } } }, [value]);
  return <svg ref={ref} className="mx-auto max-w-full" />;
}

const SIZES = { small: 'w-[38mm]', medium: 'w-[50mm]', large: 'w-[64mm]' };
export default function Barcodes() {
  const [rows, setRows] = useState([]);
  const [size, setSize] = useState('medium');
  const [showPrice, setShowPrice] = useState(true);
  const labels = rows.flatMap((r) => Array.from({ length: Math.max(0, Math.min(500, Number(r.copies) || 0)) }, (_, i) => ({ ...r, k: `${r.id}-${i}` })));
  return (
    <>
      <PageHeader title="Barcode labels" subtitle="Pick products, choose how many labels each, then print on a label sheet or roll." actions={<Btn icon="print" disabled={!labels.length} onClick={() => window.print()}>Print {labels.length || ''} labels</Btn>} />
      <div className="grid items-start gap-5 lg:grid-cols-[380px_minmax(0,1fr)]">
        <Card>
          <VariantPicker sellable={false} excludeCombos onPick={(v) => setRows((s) => (s.some((x) => x.id === v.id) ? s : [...s, { id: v.id, name: v.name, label: v.label, code: v.barcode || v.sku, price: v.price, copies: Math.max(1, v.stock || 1) }]))} />
          <div className="mt-4 grid gap-2">
            {rows.map((r) => (
              <div key={r.id} className="flex items-center gap-2 rounded-xl border border-taupe-100 p-2">
                <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{r.name}</p><p className="text-xs text-taupe-600">{r.label} · {r.code}</p></div>
                <input type="number" min="1" max="500" aria-label={`Labels for ${r.name}`} value={r.copies} onChange={(e) => setRows((s) => s.map((x) => (x.id === r.id ? { ...x, copies: e.target.value } : x)))} className="w-20 rounded-lg border border-taupe-200 px-2 py-1.5 text-sm" />
                <IconBtn icon="trash" label="Remove" onClick={() => setRows((s) => s.filter((x) => x.id !== r.id))} />
              </div>
            ))}
            {!rows.length && <p className="rounded-xl bg-taupe-50 py-8 text-center text-sm text-taupe-600">Search and add products. Copies default to the units in stock.</p>}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3"><Select label="Label size" value={size} onChange={(e) => setSize(e.target.value)} options={[{ value: 'small', label: 'Small 38mm' }, { value: 'medium', label: 'Medium 50mm' }, { value: 'large', label: 'Large 64mm' }]} /><Select label="Price on label" value={showPrice ? '1' : '0'} onChange={(e) => setShowPrice(e.target.value === '1')} options={[{ value: '1', label: 'Show' }, { value: '0', label: 'Hide' }]} /></div>
        </Card>
        <Card><p className="mb-3 text-sm font-bold">Preview</p>
          <div id="print-area" className="flex flex-wrap gap-2">
            {labels.slice(0, 500).map((l) => (
              <div key={l.k} className={`${SIZES[size]} break-inside-avoid rounded border border-dashed border-taupe-300 p-1.5 text-center text-black print:border-0`}>
                <p className="truncate text-[10px] font-bold leading-tight">{l.name}</p><p className="truncate text-[9px] leading-tight">{l.label}{showPrice ? ` · ${taka(l.price)}` : ''}</p>
                <Barcode value={String(l.code)} />
              </div>
            ))}
            {!labels.length && <p className="w-full py-16 text-center text-sm text-taupe-600">Labels appear here.</p>}
          </div>
        </Card>
      </div>
    </>
  );
}
