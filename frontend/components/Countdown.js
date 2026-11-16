'use client';
import { useEffect, useState } from 'react';

function left() {
  const now = new Date();
  const end = new Date(now);
  end.setHours(24, 0, 0, 0);
  const s = Math.floor((end - now) / 1000);
  return { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

export default function Countdown() {
  const [t, setT] = useState(null);
  useEffect(() => {
    setT(left());
    const id = setInterval(() => setT(left()), 1000);
    return () => clearInterval(id);
  }, []);
  const pad = (n) => (t ? String(n).padStart(2, '0') : '--');
  return (
    <div className="flex gap-2.5" aria-label="Time left today">
      {[['Hours', t?.h], ['Mins', t?.m], ['Secs', t?.s]].map(([label, v]) => (
        <div key={label} className="min-w-[74px] border border-white/15 bg-white/10 px-3.5 py-2.5 text-center">
          <strong className="block font-serif text-[26px] font-normal tabular-nums text-white">{pad(v)}</strong>
          <span className="text-[11px] uppercase tracking-widest text-[#E09F87]">{label}</span>
        </div>
      ))}
    </div>
  );
}