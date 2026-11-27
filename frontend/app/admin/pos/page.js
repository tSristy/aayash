'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api, post, useFetch, useDebounced } from '@/lib/admin-api';
import { taka, fmtDateTime } from '@/lib/format';
import { Alert, Btn, Card, IconBtn, Input, Modal, Select, useToast, I } from '@/components/admin/ui/kit';

function Receipt({ sale, cart, onClose, shop }) {
  return (
    <Modal title="Sale complete" onClose={onClose} width="max-w-sm" footer={<><Btn variant="outline" onClick={onClose}>New sale</Btn><Btn icon="print" onClick={() => window.print()}>Print receipt</Btn></>}>
      <div id="print-area" className="mx-auto w-full max-w-[300px] font-mono text-xs text-black">
        <p className="text-center text-sm font-bold">{shop || 'Aayash E-Mart'}</p>
        <p className="text-center">Receipt {sale.order_no}</p><p className="mb-2 text-center">{fmtDateTime(new Date())}</p>
        <hr className="my-1 border-dashed border-black" />
        {cart.map((i) => <div key={i.id} className="flex justify-between gap-2"><span>{i.name} {i.label} ×{i.qty}</span><span>{taka(i.price * i.qty)}</span></div>)}
        <hr className="my-1 border-dashed border-black" />
        <div className="flex justify-between font-bold"><span>TOTAL</span><span>{taka(sale.total)}</span></div>
        <div className="flex justify-between"><span>Paid</span><span>{taka(sale.paid)}</span></div>
        {sale.change > 0 && <div className="flex justify-between"><span>Change</span><span>{taka(sale.change)}</span></div>}
        <p className="mt-3 text-center">Thank you!</p>
      </div>
    </Modal>
  );
}

export default function Pos() {
  const toast = useToast();
  const [q, setQ] = useState('');
  const dq = useDebounced(q, 250);
  const { data } = useFetch('/ops/variants', { q: dq || undefined, sellable: '1', limit: 60 });
  const { data: accData } = useFetch('/ops/pos/accounts');
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState('');
  const [method, setMethod] = useState('cash');
  const [accountId, setAccountId] = useState('');
  const [received, setReceived] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(null);
  const searchRef = useRef(null);
  const accounts = (accData?.items || []).filter((a) => a.is_active);
  useEffect(() => { if (!accountId && accounts.length) setAccountId(String((accounts.find((a) => a.is_default) || accounts[0]).id)); }, [accounts, accountId]);

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const disc = Math.min(subtotal, Math.max(0, Number(discount) || 0));
  const total = subtotal - disc;
  const paid = received === '' ? total : Number(received);
  const change = Math.max(0, paid - total);

  const add = (v) => {
    if (v.stock < 1) return toast(`${v.name} is out of stock`, 'error');
    setCart((c) => {
      const ex = c.find((i) => i.id === v.id);
      if (ex) return c.map((i) => (i.id === v.id ? { ...i, qty: Math.min(i.stock, i.qty + 1) } : i));
      return [...c, { id: v.id, name: v.name, label: v.label, price: v.price, qty: 1, stock: v.stock, image: v.image_url }];
    });
  };
  const setQty = (id, qty) => setCart((c) => c.map((i) => (i.id === id ? { ...i, qty: Math.max(1, Math.min(i.stock, qty)) } : i)));

  async function scan(e) {
    if (e.key !== 'Enter' || !q.trim()) return;
    e.preventDefault();
    try {
      const d = await api('/ops/variants', { query: { q: q.trim(), sellable: '1', limit: 5 } });
      const exact = d.items.find((v) => v.barcode === q.trim() || v.sku === q.trim()) || (d.items.length === 1 ? d.items[0] : null);
      if (exact) { add(exact); setQ(''); } else toast('No single match. Pick from the list.', 'error');
    } catch (err) { toast(err.message, 'error'); }
  }

  async function charge() {
    setBusy(true); setError('');
    try {
      const sale = await post('/ops/pos/sale', { items: cart.map((i) => ({ variantId: i.id, qty: i.qty })), discount: disc || undefined, paymentMethod: method, accountId: accountId || undefined, paidAmount: paid, customer: { name: name || undefined, phone: phone || undefined } });
      setDone({ sale, cart }); setCart([]); setDiscount(''); setReceived(''); setName(''); setPhone('');
    } catch (e) { setError(e.message); } finally { setBusy(false); }
  }

  const items = data?.items || [];
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div>
        <h1 className="mb-1 text-2xl font-bold">POS · New sale</h1>
        <p className="mb-4 text-sm text-taupe-600">Scan a barcode or tap a product. Press Enter to add an exact barcode / SKU match.</p>
        <div className="relative mb-4">
          <I name="barcode" size={18} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-taupe" />
          <input ref={searchRef} autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={scan} placeholder="Scan barcode or search product…" aria-label="Scan or search"
            className="w-full rounded-2xl border-2 border-transparent bg-white py-3.5 pl-11 pr-4 text-base shadow-card focus:border-primary focus:outline-none" />
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {items.map((v) => (
            <button key={v.id} onClick={() => { add(v); searchRef.current?.focus(); }} disabled={v.stock < 1} className="rounded-2xl bg-white p-3 text-left shadow-card transition-shadow hover:shadow-pop disabled:opacity-50">
              <span className="mb-2 grid h-24 place-items-center overflow-hidden rounded-xl bg-taupe-50">{v.image_url ? <img src={v.image_url} alt="" className="h-full w-full object-cover" /> : <I name="box" size={30} className="text-taupe-300" />}</span>
              <p className="line-clamp-2 text-sm font-medium leading-tight">{v.name}</p>
              <p className="text-xs text-taupe-600">{v.label}</p>
              <div className="mt-1 flex items-center justify-between"><b>{taka(v.price)}</b><span className={`text-xs ${v.stock < 1 ? 'text-danger' : v.stock < 5 ? 'text-amber-700' : 'text-taupe-600'}`}>{v.stock < 1 ? 'Out' : `${v.stock} left`}</span></div>
            </button>
          ))}
          {!items.length && <p className="col-span-full py-16 text-center text-taupe-600">No products found.</p>}
        </div>
      </div>

      <Card className="lg:sticky lg:top-[72px]">
        <h2 className="mb-3 text-lg font-bold">Cart {cart.length > 0 && <span className="text-sm font-normal text-taupe-600">({cart.reduce((s, i) => s + i.qty, 0)} items)</span>}</h2>
        {error && <div className="mb-3"><Alert>{error}</Alert></div>}
        <div className="grid max-h-[320px] gap-2 overflow-y-auto">
          {!cart.length && <p className="rounded-xl bg-taupe-50 py-10 text-center text-sm text-taupe-600">Cart is empty.</p>}
          {cart.map((i) => (
            <div key={i.id} className="flex items-center gap-2 rounded-xl border border-taupe-100 p-2">
              <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{i.name}</p><p className="text-xs text-taupe-600">{i.label} · {taka(i.price)}</p></div>
              <div className="flex items-center gap-1"><button aria-label="Decrease" className="grid h-7 w-7 place-items-center rounded-full bg-taupe-100 text-lg leading-none" onClick={() => (i.qty > 1 ? setQty(i.id, i.qty - 1) : setCart((c) => c.filter((x) => x.id !== i.id)))}>−</button><span className="w-6 text-center text-sm font-bold">{i.qty}</span><button aria-label="Increase" className="grid h-7 w-7 place-items-center rounded-full bg-taupe-100 text-lg leading-none" onClick={() => setQty(i.id, i.qty + 1)}>+</button></div>
              <p className="w-16 text-right text-sm font-bold">{taka(i.price * i.qty)}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 grid gap-3 border-t border-taupe-100 pt-4">
          <div className="grid grid-cols-2 gap-3"><Input label="Customer (optional)" value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" /><Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01…" inputMode="tel" /></div>
          <div className="grid grid-cols-2 gap-3"><Input label="Discount (৳)" type="number" min="0" value={discount} onChange={(e) => setDiscount(e.target.value)} /><Select label="Payment" value={method} onChange={(e) => setMethod(e.target.value)} options={[{ value: 'cash', label: 'Cash' }, { value: 'card', label: 'Card' }, { value: 'mobile', label: 'bKash / Nagad' }]} /></div>
          <Select label="Deposit into account" value={accountId} onChange={(e) => setAccountId(e.target.value)} options={accounts.map((a) => ({ value: String(a.id), label: a.name }))} />
          <Input label="Amount received (৳)" type="number" min="0" value={received} onChange={(e) => setReceived(e.target.value)} placeholder={String(total)} />
          <dl className="grid gap-1 text-sm">
            <div className="flex justify-between text-taupe-600"><dt>Subtotal</dt><dd>{taka(subtotal)}</dd></div>
            {disc > 0 && <div className="flex justify-between text-taupe-600"><dt>Discount</dt><dd>− {taka(disc)}</dd></div>}
            <div className="flex justify-between text-2xl font-bold"><dt>Total</dt><dd>{taka(total)}</dd></div>
            {change > 0 && <div className="flex justify-between text-emerald-700"><dt>Change due</dt><dd>{taka(change)}</dd></div>}
          </dl>
          <Btn size="lg" loading={busy} disabled={!cart.length} onClick={charge} icon="check">Charge {taka(total)}</Btn>
          {cart.length > 0 && <Btn variant="ghost" onClick={() => setCart([])}>Clear cart</Btn>}
        </div>
      </Card>
      {done && <Receipt sale={done.sale} cart={done.cart} onClose={() => { setDone(null); searchRef.current?.focus(); }} />}
    </div>
  );
}
