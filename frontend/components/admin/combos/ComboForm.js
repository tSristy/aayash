'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { post, put, useFetch } from '@/lib/admin-api';
import { taka } from '@/lib/format';
import { Alert, Btn, Card, IconBtn, Input, Select, Textarea, SectionTitle, useToast } from '../ui/kit';
import ImageField from '../ui/ImageField';
import VariantPicker from '../orders/VariantPicker';

const GIFT_MODES = [
  { value: 'combo_only', label: 'Only inside the combo pack (recommended)', help: 'Gifts are given only when the customer buys the combo. Buying the main product alone gets no gift.' },
  { value: 'with_main', label: 'Also free with the main product alone', help: 'Every order of the main product automatically adds the gift items at ৳0 and deducts their stock. If a gift is out of stock the order still goes through without it.' },
];

function ItemRow({ i, onQty, onRemove }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-taupe-100 p-3"><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{i.name}</p><p className="text-xs text-taupe-600">{i.label} · {taka(i.price)} · {i.stock} in stock</p></div>
      <input type="number" min="1" max="100" aria-label={`Quantity of ${i.name}`} value={i.qty} onChange={(e) => onQty(e.target.value)} className="w-20 rounded-lg border border-taupe-200 px-2 py-1.5 text-sm" /><IconBtn icon="trash" label="Remove" onClick={onRemove} /></div>
  );
}

export default function ComboForm({ combo }) {
  const router = useRouter(); const toast = useToast();
  const { data: cats } = useFetch('/catalog/categories/lookup', { page: 1, limit: 100 });
  const [f, setF] = useState({ name: combo?.name || '', price: combo?.price ?? '', compare_at_price: combo?.compare_at_price ?? '', category_id: combo?.category_id ? String(combo.category_id) : '', status: combo?.status || 'active', short_desc: combo?.short_desc || '', description: combo?.description || '', image_url: combo?.image_url || '', gift_mode: combo?.gift_mode || 'combo_only', items: (combo?.items || []).map((i) => ({ variantId: i.variant_id, name: i.name, label: i.label, qty: i.qty, price: i.price, stock: i.stock, role: i.role === 'gift' ? 'gift' : 'main' })) });
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const main = f.items.find((i) => i.role === 'main');
  const gifts = f.items.filter((i) => i.role === 'gift');
  const addItem = (v, role) => setF((s) => (s.items.some((i) => i.variantId === v.id) ? s : { ...s, items: [...s.items, { variantId: v.id, name: v.name, label: v.label, qty: 1, price: v.price, stock: v.stock, role }] }));
  const setQty = (id, qty) => setF((s) => ({ ...s, items: s.items.map((x) => (x.variantId === id ? { ...x, qty } : x)) }));
  const remove = (id) => setF((s) => ({ ...s, items: s.items.filter((x) => x.variantId !== id) }));
  const regular = f.items.reduce((s, i) => s + i.price * (Number(i.qty) || 0), 0);
  const possible = f.items.length ? Math.min(...f.items.map((i) => Math.floor((i.stock || 0) / (Number(i.qty) || 1)))) : 0;
  const save = async (e) => {
    e.preventDefault(); setBusy(true); setError('');
    try {
      const body = { name: f.name, price: Number(f.price), compare_at_price: f.compare_at_price === '' ? null : Number(f.compare_at_price), category_id: Number(f.category_id), status: f.status, gift_mode: f.gift_mode, short_desc: f.short_desc, description: f.description, image_url: f.image_url, items: f.items.map((i) => ({ variantId: i.variantId, qty: Number(i.qty), role: i.role })) };
      const r = combo ? await put(`/ops/combos/${combo.id}`, body) : await post('/ops/combos', body);
      toast('Combo saved'); router.push(combo ? '/admin/combos' : `/admin/combos/${r.id}`);
    } catch (x) { setError(x.message); } finally { setBusy(false); }
  };
  return (
    <form onSubmit={save} className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="grid gap-5">
        {error && <Alert>{error}</Alert>}
        <Card><SectionTitle>Combo details</SectionTitle><div className="grid gap-4 sm:grid-cols-2">
          <Input label="Combo name" required value={f.name} onChange={(e) => set('name', e.target.value)} wrap="sm:col-span-2" />
          <Select label="Category" required value={f.category_id} onChange={(e) => set('category_id', e.target.value)} options={(cats?.items || []).map((c) => ({ value: String(c.id), label: c.name }))} placeholder="Choose category" />
          <Select label="Status" value={f.status} onChange={(e) => set('status', e.target.value)} options={[{ value: 'active', label: 'Active (visible in shop)' }, { value: 'draft', label: 'Draft' }, { value: 'archived', label: 'Archived' }]} />
          <Textarea label="Short description" rows={2} value={f.short_desc} onChange={(e) => set('short_desc', e.target.value)} wrap="sm:col-span-2" />
          <Textarea label="Description" rows={4} value={f.description} onChange={(e) => set('description', e.target.value)} wrap="sm:col-span-2" />
          <div className="sm:col-span-2"><ImageField label="Combo image" value={f.image_url} onChange={(v) => set('image_url', v)} /></div></div></Card>
        <Card><SectionTitle>Main product</SectionTitle>
          <p className="mb-3 text-sm text-taupe-600">The product customers come for. Its own page will show the free gifts below.</p>
          {main ? <ItemRow i={main} onQty={(v) => setQty(main.variantId, v)} onRemove={() => remove(main.variantId)} />
            : <VariantPicker sellable={false} excludeCombos onPick={(v) => addItem(v, 'main')} />}
        </Card>
        <Card><SectionTitle>Free gifts</SectionTitle>
          <p className="mb-3 text-sm text-taupe-600">Side products included at no extra charge. Add as many as you like.</p>
          <VariantPicker sellable={false} excludeCombos onPick={(v) => addItem(v, 'gift')} />
          <div className="mt-4 grid gap-2">{gifts.map((i) => <ItemRow key={i.variantId} i={i} onQty={(v) => setQty(i.variantId, v)} onRemove={() => remove(i.variantId)} />)}
            {!gifts.length && <p className="rounded-xl bg-taupe-50 py-6 text-center text-sm text-taupe-600">Add at least one free gift.</p>}</div></Card>
        <Card><SectionTitle>Where do the gifts apply?</SectionTitle>
          <div className="grid gap-2">{GIFT_MODES.map((m) => (
            <label key={m.value} className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${f.gift_mode === m.value ? 'border-taupe-900 bg-taupe-50' : 'border-taupe-200'}`}>
              <input type="radio" name="gift_mode" className="mt-1" checked={f.gift_mode === m.value} onChange={() => set('gift_mode', m.value)} />
              <span><span className="block text-sm font-medium">{m.label}</span><span className="block text-xs text-taupe-600">{m.help}</span></span></label>))}</div></Card>
      </div>
      <aside className="grid content-start gap-5 lg:sticky lg:top-[72px]"><Card><SectionTitle>Pricing</SectionTitle><div className="grid gap-4">
        <Input label="Combo price (৳)" required type="number" min="1" value={f.price} onChange={(e) => set('price', e.target.value)} />
        <Input label="Regular price shown crossed out (৳)" type="number" min="0" value={f.compare_at_price} onChange={(e) => set('compare_at_price', e.target.value)} help={regular ? `Items cost ${taka(regular)} separately.` : ''} />
        {regular > 0 && Number(f.price) > 0 && <p className={`rounded-lg px-3 py-2 text-sm ${Number(f.price) < regular ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-900'}`}>{Number(f.price) < regular ? `Customers save ${taka(regular - Number(f.price))}` : 'Combo costs more than buying separately.'}</p>}
        <p className="text-sm text-taupe-700">Stock follows the components: <b>{possible}</b> combos can be sold right now.</p>
        <Btn type="submit" loading={busy} disabled={!main || !gifts.length}>Save combo</Btn></div></Card></aside>
    </form>
  );
}
