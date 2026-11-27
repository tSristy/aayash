'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';
import Field, { inputCls } from '@/components/ui/Field';
import { useSite } from '@/components/SiteContext';
import { money } from '@/lib/format';

const input = `${inputCls}  !border-line !bg-white`;
const on = (v) => v === '1' || v === 1;
const post = async (path, body) => {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
  const data = await res.json().catch(() => ({})); if (!res.ok) throw new Error(data.error || 'Something went wrong.'); return data;
};

export default function Account() {
  const { settings } = useSite();
  const [me, setMe] = useState(undefined); const [orders, setOrders] = useState([]);
  const [mode, setMode] = useState('login'); const [f, setF] = useState({ name: '', phone: '', email: '', password: '' });
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));

  const load = async () => {
    const r = await fetch('/api/customer/me'); if (!r.ok) { setMe(null); return; }
    setMe((await r.json()).customer);
    const o = await fetch('/api/customer/orders'); if (o.ok) setOrders((await o.json()).items);
  };
  useEffect(() => { load(); const e = new URLSearchParams(window.location.search).get('error'); if (e) setError(e); }, []);

  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    try { await post(mode === 'login' ? '/api/customer/auth/login' : '/api/customer/auth/register', mode === 'login' ? { phone: f.phone, password: f.password } : f); await load(); }
    catch (x) { setError(x.message); } finally { setBusy(false); }
  }
  const logout = async () => { await post('/api/customer/auth/logout'); setMe(null); setOrders([]); };

  if (me === undefined) return <Container className="py-16 text-center text-muted">Loading…</Container>;
  if (me) return (
    <Container className="py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3"><div><h1 className="font-bold text-4xl">Hello, {me.name}</h1><p className="text-sm text-ink/80">{me.phone?.includes(':') ? '' : me.phone}</p></div><Button variant="outline" onClick={logout}>Sign out</Button></div>
        <h2 className="mb-3 font-bold text-2xl">Your orders</h2>
        <div className="border border-line bg-white">{orders.length === 0 && <p className="p-6 text-ink/80">No orders yet. <Link className="text-brown underline" href="/products">Start shopping</Link></p>}
          {orders.map((o) => <Link key={o.order_no} href={`/orders/tracking?orderNo=${o.order_no}`} className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-4 last:border-0 hover:bg-tint"><div><p className="font-mono font-bold">{o.order_no}</p><p className="text-xs text-muted">{new Date(o.created_at).toLocaleDateString()}</p></div><span className="text-sm">{o.status_label}</span><b>{money(o.total)}</b></Link>)}</div>
      </div>
    </Container>
  );
  const social = [['google', 'Google'], ['facebook', 'Facebook']].filter(([k]) => on(settings[`${k}_login_enabled`]));
  return (
    <Container className="py-12">
      <div className="mx-auto max-w-md border border-line bg-tint p-6 sm:p-8">
        <div className="mb-5 flex gap-4 text-sm font-semibold">{[['login', 'Sign in'], ['register', 'Create account']].map(([k, l]) => <button key={k} onClick={() => { setMode(k); setError(''); }} className={`border-b-2 pb-1 ${mode === k ? 'border-primary text-ink' : 'border-transparent text-muted'}`}>{l}</button>)}</div>
        <form onSubmit={submit} className="grid gap-4">
          {mode === 'register' && <Field label="Full name"><input required value={f.name} onChange={set('name')} className={input} /></Field>}
          <Field label="Mobile number"><input required type="tel" value={f.phone} onChange={set('phone')} className={input} /></Field>
          {mode === 'register' && <Field label="Email (optional)"><input type="email" value={f.email} onChange={set('email')} className={input} /></Field>}
          <Field label="Password"><input required type="password" minLength={6} value={f.password} onChange={set('password')} className={input} /></Field>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <Button size="lg" block disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</Button>
        </form>
        {social.length > 0 && <div className="mt-5 grid gap-2 border-t border-line pt-5"><p className="text-center text-xs text-muted">or continue with</p>{social.map(([k, l]) => <a key={k} href={`/api/customer/auth/${k}/start`} className="border border-ink py-3 text-center text-xs font-semibold hover:bg-white">{l}</a>)}</div>}
      </div>
    </Container>
  );
}
