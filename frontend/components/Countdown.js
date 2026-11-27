'use client';
import { useEffect, useState } from 'react';

function left(until) {
  const now = new Date();
  let end = until ? new Date(until) : null;
  if (!end || Number.isNaN(end.getTime())) { end = new Date(now); end.setHours(24, 0, 0, 0); }
  const total = Math.max(0, Math.floor((end - now) / 1000));
  return { d: Math.floor(total / 86400), h: Math.floor((total % 86400) / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
}

/** Counts down to `until` (an end-of-day is assumed for a plain date), or to midnight when no date is given. */
export default function Countdown({ until }) {
  const target = until ? (String(until).length <= 10 ? `${until}T23:59:59` : until) : null;
  const [t, setT] = useState(null);
  useEffect(() => {
    setT(left(target));
    const id = setInterval(() => setT(left(target)), 1000);
    return () => clearInterval(id);
  }, [target]);
  const pad = (n) => (t ? String(n).padStart(2, '0') : '--');
  return (
    <div className="flex gap-2.5" aria-label="Time left today">
      {[...(t?.d ? [['Days', t.d]] : []), ['Hours', t?.h], ['Mins', t?.m], ['Secs', t?.s]].map(([label, v]) => (
        <div key={label} className="min-w-[64px] rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-center">
          <strong className="block text-2xl font-bold tabular-nums text-white">{pad(v)}</strong>
          <span className="text-[11px] uppercase tracking-wider text-white/70">{label}</span>
        </div>
      ))}
    </div>
  );
}