'use client';
import { useEffect, useState } from 'react';
import { money } from '@/lib/format';

/** Phones only: a bottom "Order now" bar that scrolls to the form and hides while the form is on screen. */
export default function StickyOrderBar({ price, label = 'Order now' }) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = document.getElementById('order');
    if (!el || !('IntersectionObserver' in window)) return undefined;
    const io = new IntersectionObserver(([e]) => setVisible(!e.isIntersecting), { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div className={`fixed inset-x-0 bottom-0 z-40 border-t border-line bg-white/95 px-4 py-3 backdrop-blur transition-transform duration-200 md:hidden ${visible ? 'translate-y-0' : 'translate-y-full'}`}>
      <div className="mx-auto flex max-w-md items-center gap-3">
        {price ? <p className="text-lg font-bold text-ink">{money(price)}</p> : null}
        <a href="#order" className="flex-1 rounded-lg bg-primary px-5 py-3 text-center text-sm font-bold text-ink hover:bg-primary-hover">{label}</a>
      </div>
    </div>
  );
}
