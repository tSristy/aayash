'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from './ui/Icons';

/** Full-width hero slider (edge to edge). Text sits on the left over a soft fade. Auto-advances; pauses on hover. */
export default function HomeSlider({ slides }) {
  const [i, setI] = useState(0); const [pause, setPause] = useState(false);
  const n = slides.length;
  useEffect(() => { if (n < 2 || pause) return undefined; const t = setInterval(() => setI((x) => (x + 1) % n), 5500); return () => clearInterval(t); }, [n, pause]);
  if (!n) return null;
  return (
    <div className="relative w-full overflow-hidden bg-tint" onMouseEnter={() => setPause(true)} onMouseLeave={() => setPause(false)} role="region" aria-roledescription="carousel" aria-label="Featured offers">
      <div className="relative h-[230px] sm:h-[340px] lg:h-auto lg:aspect-[3/1] lg:max-h-[640px]">
        {slides.map((s, k) => {
          const inner = (
            <>
              <img src={s.image_url} alt={s.title || ''} className="absolute inset-0 h-full w-full object-cover" loading={k === 0 ? 'eager' : 'lazy'} />
              {(s.title || s.subtitle || s.button_text) && (
                <div className="absolute inset-0 flex items-center bg-gradient-to-r from-black/60 via-black/25 to-transparent">
                  <div className="mx-auto w-full max-w-container px-6 sm:px-10">
                    <div className="max-w-[min(30rem,80%)] text-white">
                      {s.title && <h2 className="text-2xl font-bold leading-tight sm:text-4xl lg:text-5xl">{s.title}</h2>}
                      {s.subtitle && <p className="mt-2 text-sm text-white/90 sm:mt-3 sm:text-lg">{s.subtitle}</p>}
                      {s.button_text && <span className="mt-4 inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-ink sm:mt-6 sm:px-7 sm:py-3">{s.button_text}</span>}
                    </div>
                  </div>
                </div>
              )}
            </>
          );
          const cls = `absolute inset-0 block transition-opacity duration-500 ${k === i ? 'opacity-100' : 'pointer-events-none opacity-0'}`;
          return s.link_url
            ? <Link key={s.id || k} href={s.link_url} className={cls} aria-hidden={k !== i} tabIndex={k === i ? 0 : -1}>{inner}</Link>
            : <div key={s.id || k} className={cls} aria-hidden={k !== i}>{inner}</div>;
        })}
      </div>
      {n > 1 && <>
        <button aria-label="Previous slide" onClick={() => setI((i - 1 + n) % n)} className="absolute left-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow hover:bg-white sm:grid"><ChevronLeft size={20} /></button>
        <button aria-label="Next slide" onClick={() => setI((i + 1) % n)} className="absolute right-3 top-1/2 hidden h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-ink shadow hover:bg-white sm:grid"><ChevronRight size={20} /></button>
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 gap-2">{slides.map((_, k) => <button key={k} aria-label={`Slide ${k + 1}`} onClick={() => setI(k)} className={`h-2 rounded-full transition-all ${k === i ? 'w-6 bg-white' : 'w-2 bg-white/60'}`} />)}</div>
      </>}
    </div>
  );
}
