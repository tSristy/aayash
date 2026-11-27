'use client';
import { useState } from 'react';

export default function ReviewForm({ slug }) {
  const [f, setF] = useState({ author: '', rating: 5, body: '' });
  const [st, setSt] = useState({ busy: false, msg: '', error: '' });
  async function submit(e) {
    e.preventDefault(); setSt({ busy: true, msg: '', error: '' });
    try {
      const res = await fetch('/api/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...f, productSlug: slug }) });
      const d = await res.json(); if (!res.ok) throw new Error(d.error || 'Could not send your review.');
      setSt({ busy: false, msg: d.message || 'Thanks! Your review will appear after approval.', error: '' }); setF({ author: '', rating: 5, body: '' });
    } catch (x) { setSt({ busy: false, msg: '', error: x.message }); }
  }
  return (
    <form onSubmit={submit} className="grid gap-3 border border-line bg-tint p-4">
      <p className="text-sm font-semibold">Write a review</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <input required maxLength={120} placeholder="Your name" value={f.author} onChange={(e) => setF({ ...f, author: e.target.value })} className="border border-line bg-white px-3 py-2 text-sm" />
        <select aria-label="Rating" value={f.rating} onChange={(e) => setF({ ...f, rating: Number(e.target.value) })} className="border border-line bg-white px-3 py-2 text-sm">{[5, 4, 3, 2, 1].map((n) => <option key={n} value={n}>{'★'.repeat(n)} ({n})</option>)}</select>
      </div>
      <textarea rows={3} maxLength={1000} placeholder="What did you think?" value={f.body} onChange={(e) => setF({ ...f, body: e.target.value })} className="border border-line bg-white px-3 py-2 text-sm" />
      {st.error && <p role="alert" className="text-sm text-red-700">{st.error}</p>}
      {st.msg && <p role="status" className="text-sm text-success">{st.msg}</p>}
      <button disabled={st.busy} className="w-fit bg-primary px-5 py-2.5 text-xs font-semibold text-ink hover:bg-primary-hover disabled:opacity-50">{st.busy ? 'Sending…' : 'Submit review'}</button>
    </form>
  );
}
