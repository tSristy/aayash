export const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

// Server-side fetch that never throws: returns `fallback` if the API is down or returns an error.
export async function safe(path, fallback) {
  try {
    const res = await fetch(API + path, { cache: 'no-store' });
    if (!res.ok) return fallback;
    return await res.json();
  } catch {
    return fallback;
  }
}
