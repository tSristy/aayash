// Browser calls use relative URLs: Next rewrites /api/* and /uploads/* to the backend (see next.config.js),
// so cookies stay same-site and no CORS is needed. Server components call the backend directly.
export const API = '';
const INTERNAL = (process.env.AYASHMART_BACKEND_INTERNAL_URL || 'http://127.0.0.1:4000').replace(/\/$/, '');

// Server-side fetch that never throws: returns `fallback` if the API is down or returns an error.
export async function safe(path, fallback) {
  try {
    const res = await fetch(INTERNAL + path, { cache: 'no-store' });
    if (!res.ok) return fallback;
    return await res.json();
  } catch {
    return fallback;
  }
}
