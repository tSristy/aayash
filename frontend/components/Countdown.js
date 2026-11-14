'use client';
import { useEffect, useState } from 'react';

// Counts down to midnight tonight, so the "today only" offer never goes stale.
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
    <div className="countdown" aria-label="Time left today">
      {[['Hours', t?.h], ['Mins', t?.m], ['Secs', t?.s]].map(([label, v]) => (
        <div key={label}><strong>{pad(v)}</strong><span>{label}</span></div>
      ))}
    </div>
  );
}
