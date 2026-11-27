'use client';
import { useState } from 'react';
import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';
import Field, { inputCls } from '@/components/ui/Field';
import { useSite } from '@/components/SiteContext';

const input = `${inputCls}  !border-line !bg-white`;
export default function Contact() {
  const { settings: s } = useSite();
  const [f, setF] = useState({ name: '', phone: '', email: '', subject: '', message: '' });
  const [state, setState] = useState({ busy: false, done: false, error: '' });
  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }));
  async function submit(e) {
    e.preventDefault(); setState({ busy: true, done: false, error: '' });
    try {
      const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(f) });
      const data = await res.json(); if (!res.ok) throw new Error(data.error || 'Could not send your message.');
      setState({ busy: false, done: true, error: '' });
    } catch (x) { setState({ busy: false, done: false, error: x.message }); }
  }
  return (
    <Container className="py-12">
      <div className="mx-auto grid max-w-4xl gap-10 md:grid-cols-[1fr_1.2fr]">
        <div>
          <h1 className="mb-4 font-bold text-4xl text-brown">Contact us</h1>
          <p className="mb-6 text-ink/80">Questions about an order, a product or delivery? Send us a message and we will reply.</p>
          <ul className="grid gap-2 text-sm text-ink/80">{s.contact_phone && <li>📞 <a href={`tel:${s.contact_phone}`}>{s.contact_phone}</a></li>}{s.contact_email && <li>✉️ <a href={`mailto:${s.contact_email}`}>{s.contact_email}</a></li>}{s.contact_address && <li>📍 {s.contact_address}</li>}</ul>
        </div>
        {state.done ? <div className="border border-line bg-tint p-8"><p className="font-semibold text-2xl">Thank you!</p><p className="mt-2 text-ink/80">We received your message and will get back to you soon.</p></div> : (
          <form onSubmit={submit} className="grid gap-4 border border-line bg-tint p-6 sm:p-8">
            <Field label="Your name"><input required maxLength={120} value={f.name} onChange={set('name')} className={input} /></Field>
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Phone"><input type="tel" value={f.phone} onChange={set('phone')} className={input} /></Field><Field label="Email"><input type="email" value={f.email} onChange={set('email')} className={input} /></Field></div>
            <Field label="Subject"><input maxLength={160} value={f.subject} onChange={set('subject')} className={input} /></Field>
            <Field label="Message"><textarea required rows={5} maxLength={2000} value={f.message} onChange={set('message')} className={input} /></Field>
            {state.error && <p role="alert" className="text-sm text-red-700">{state.error}</p>}
            <Button size="lg" disabled={state.busy}>{state.busy ? 'Sending…' : 'Send message'}</Button>
          </form>)}
      </div>
    </Container>
  );
}
