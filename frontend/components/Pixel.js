'use client';
import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useSite } from './SiteContext';

const on = (v) => v === '1' || v === 1 || v === true;

function load(pixelId) {
  if (typeof window === 'undefined' || window.fbq) return;
  const n = (window.fbq = function fbq(...a) { n.callMethod ? n.callMethod(...a) : n.queue.push(a); });
  if (!window._fbq) window._fbq = n;
  n.push = n; n.loaded = true; n.version = '2.0'; n.queue = [];
  const s = document.createElement('script'); s.async = true; s.src = 'https://connect.facebook.net/en_US/fbevents.js';
  document.head.appendChild(s);
  window.fbq('init', pixelId);
}

/** Fire a browser pixel event. eventId must match what the server sends so Meta counts it once. */
export function track(name, data = {}, eventId) {
  try { if (window.fbq) window.fbq('track', name, data, eventId ? { eventID: eventId } : undefined); } catch { /* tracking must never break the shop */ }
}

/** _fbp / _fbc cookies, sent with the order so the server-side event can be matched to the ad click. */
export function fbCookies() {
  try {
    const get = (k) => document.cookie.split('; ').find((c) => c.startsWith(`${k}=`))?.slice(k.length + 1);
    let fbc = get('_fbc');
    const click = new URLSearchParams(window.location.search).get('fbclid');
    if (!fbc && click) fbc = `fb.1.${Date.now()}.${click}`;
    return { fbp: get('_fbp') || undefined, fbc: fbc || undefined, sourceUrl: window.location.href };
  } catch { return {}; }
}

export default function Pixel() {
  const { settings } = useSite(); const path = usePathname();
  const id = on(settings.pixel_enabled) && /^\d{5,20}$/.test(settings.pixel_id || '') ? settings.pixel_id : null;
  useEffect(() => { if (id) load(id); }, [id]);
  useEffect(() => { if (id) track('PageView'); }, [id, path]);
  return null;
}
