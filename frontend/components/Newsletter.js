'use client';
import { useState } from 'react';
import { API } from '@/lib/api';
import Button from './ui/Button';
import { inputCls } from './ui/Field';

export default function Newsletter() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await fetch(`${API}/api/newsletter`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setMsg({ ok: true, text: 'You are subscribed. Watch your inbox for offers.' });
      setEmail('');
    } catch (err) {
      setMsg({ ok: false, text: err.message || 'Could not subscribe. Try again.' });
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-wrap gap-2.5">
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email address" aria-label="Email address"
        className={`${inputCls} min-w-[200px] flex-1 !border-line !bg-white !px-4 !py-3 text-sm text-ink placeholder:text-muted focus:!border-brown`} />
      <Button type="submit">Subscribe</Button>
      {msg && <p role="status" className={`basis-full text-sm ${msg.ok ? 'text-emerald-700' : 'text-red-700'}`}>{msg.text}</p>}
    </form>
  );
}