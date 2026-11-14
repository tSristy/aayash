'use client';
import { useState } from 'react';
import { API } from '@/lib/api';

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
    <form className="news-form" onSubmit={submit}>
      <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Your email address" aria-label="Email address" />
      <button className="btn" type="submit">Subscribe</button>
      {msg && <p className={msg.ok ? 'ok' : 'err'} role="status">{msg.text}</p>}
    </form>
  );
}
