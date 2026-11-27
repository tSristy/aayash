'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { post, useFetch } from '@/lib/admin-api';
import { taka, todayStr } from '@/lib/format';
import { Alert, Btn, Card, IconBtn, Input, PageHeader, SectionTitle, Select, Textarea, useToast } from '@/components/admin/ui/kit';
import VariantPicker from '@/components/admin/orders/VariantPicker';
import { AccountSelect } from '@/components/admin/accounts/bits';
import Link from 'next/link';

export default function NewPurchase() {
  const router = useRouter(); const toast = useToast();
  const { data: sup } = useFetch('/ops/suppliers', { limit: 100 });
  const [f, setF] = useState({ supplierId: '', date: todayStr(), discount: '', paid: '', accountId: '', note: '' });
  const [items, setItems] = useState([]); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const subtotal = items.reduce((s, i) => s + (Number(i.unitCost) || 0) * (Number(i.qty) || 0), 0);
  const discount = Math.min(subtotal, Math.max(0, Number(f.discount) || 0)); const total = subtotal - discount; const paid = Math.min(total, Math.max(0, Number(f.paid) || 0));
  const submit = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try { await post('/ops/purchases', { supplierId: Number(f.supplierId), date: f.date, discount: discount || 0, paid: paid || 0, accountId: paid > 0 ? Number(f.accountId) : undefined, note: f.note || undefined, items: items.map((i) => ({ variantId: i.variantId, qty: Number(i.qty), unitCost: Number(i.unitCost) })) }); toast('Purchase saved, stock updated'); router.push('/admin/purchases'); }
    catch (x) { setError(x.message); } finally { setBusy(false); }
  };
  return (
    <>
      <PageHeader title="New purchase" subtitle="Receiving stock adds units and updates each product's average cost." />
      <form onSubmit={submit} className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="grid gap-5">{error && <Alert>{error}</Alert>}
          <Card><SectionTitle>Products received</SectionTitle><VariantPicker sellable={false} excludeCombos onPick={(v) => setItems((s) => (s.some((i) => i.variantId === v.id) ? s : [...s, { variantId: v.id, name: v.name, label: v.label, qty: 1, unitCost: v.cost_price || '', stock: v.stock }]))} />
            <div className="mt-4 grid gap-2">{items.map((i) => (
              <div key={i.variantId} className="flex flex-wrap items-center gap-3 rounded-xl border border-taupe-100 p-3"><div className="min-w-[140px] flex-1"><p className="text-sm font-medium">{i.name}</p><p className="text-xs text-taupe-600">{i.label} · {i.stock} in stock now</p></div>
                <label className="grid gap-0.5 text-xs text-taupe-600">Unit cost<input type="number" min="0" step="0.01" required value={i.unitCost} onChange={(e) => setItems((s) => s.map((x) => (x.variantId === i.variantId ? { ...x, unitCost: e.target.value } : x)))} className="w-24 rounded-lg border border-taupe-200 px-2 py-1.5 text-sm text-taupe-900" /></label>
                <label className="grid gap-0.5 text-xs text-taupe-600">Qty<input type="number" min="1" required value={i.qty} onChange={(e) => setItems((s) => s.map((x) => (x.variantId === i.variantId ? { ...x, qty: e.target.value } : x)))} className="w-20 rounded-lg border border-taupe-200 px-2 py-1.5 text-sm text-taupe-900" /></label>
                <p className="w-24 text-right text-sm font-bold">{taka((Number(i.unitCost) || 0) * (Number(i.qty) || 0))}</p><IconBtn icon="trash" label="Remove" onClick={() => setItems((s) => s.filter((x) => x.variantId !== i.variantId))} /></div>))}
              {!items.length && <p className="rounded-xl bg-taupe-50 py-8 text-center text-sm text-taupe-600">Search above to add products.</p>}</div></Card>
          <Card><Textarea label="Note" rows={2} value={f.note} onChange={(e) => set('note', e.target.value)} placeholder="Invoice number, delivery details…" /></Card>
        </div>
        <aside className="grid content-start gap-5 lg:sticky lg:top-[72px]"><Card><SectionTitle>Supplier & payment</SectionTitle><div className="grid gap-4">
          <Select label="Supplier" required value={f.supplierId} onChange={(e) => set('supplierId', e.target.value)} options={(sup?.items || []).filter((s) => s.is_active).map((s) => ({ value: String(s.id), label: s.name }))} placeholder="Choose supplier" help={<Link href="/admin/suppliers" className="text-primary-deep">Add a supplier</Link>} />
          <Input label="Date" type="date" value={f.date} onChange={(e) => set('date', e.target.value)} />
          <div className="grid grid-cols-2 gap-3"><Input label="Discount (৳)" type="number" min="0" value={f.discount} onChange={(e) => set('discount', e.target.value)} /><Input label="Paid now (৳)" type="number" min="0" value={f.paid} onChange={(e) => set('paid', e.target.value)} /></div>
          {paid > 0 && <AccountSelect label="Pay from" required value={f.accountId} onChange={(v) => set('accountId', v)} />}
          <dl className="grid gap-1.5 border-t border-taupe-100 pt-3 text-sm"><div className="flex justify-between"><dt className="text-taupe-600">Subtotal</dt><dd>{taka(subtotal)}</dd></div><div className="flex justify-between text-base font-bold"><dt>Total</dt><dd>{taka(total)}</dd></div><div className="flex justify-between text-amber-700"><dt>Owed to supplier</dt><dd>{taka(total - paid)}</dd></div></dl>
          <Btn type="submit" loading={busy} disabled={!items.length || !f.supplierId || (paid > 0 && !f.accountId)}>Save purchase</Btn></div></Card></aside>
      </form>
    </>
  );
}
