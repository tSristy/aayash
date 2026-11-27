'use client';
import { useEffect, useState } from 'react';

let cached = null;
let pending = null;

/** The shop logo set in Website → Theme. Falls back to the bundled logo until it loads. */
export default function useLogo() {
  const [logo, setLogo] = useState(cached || '/logo.png');
  useEffect(() => {
    if (cached) { setLogo(cached); return undefined; }
    let live = true;
    pending = pending || fetch('/api/site').then((r) => (r.ok ? r.json() : null)).then((d) => { cached = d?.settings?.logo_url || '/logo.png'; return cached; }).catch(() => '/logo.png');
    pending.then((url) => { if (live) setLogo(url); });
    return () => { live = false; };
  }, []);
  return logo;
}
