'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

export class ApiError extends Error {
  constructor(message, status, data) { super(message); this.status = status; this.data = data; }
}

export const qs = (query = {}) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) if (v !== undefined && v !== null && v !== '' && v !== 'all') p.set(k, v);
  const s = p.toString();
  return s ? `?${s}` : '';
};

/** Admin API call. Paths are relative to /api/admin (e.g. "/ops/dashboard"). */
export async function api(path, { method = 'GET', body, query, signal, text } = {}) {
  let res;
  try {
    res = await fetch(`/api/admin${path}${qs(query)}`, {
      method, credentials: 'same-origin', cache: 'no-store', signal,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    if (e.name === 'AbortError') throw e;
    throw new ApiError('Cannot reach the server. Check your connection and try again.', 0);
  }
  if (res.status === 401 && typeof window !== 'undefined' && !path.startsWith('/auth/')) {
    window.location.href = '/login';
    throw new ApiError('Session expired. Please sign in again.', 401);
  }
  if (text && res.ok) return res.text();
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error || data.message || `Request failed (${res.status})`, res.status, data);
  return data;
}

export const post = (path, body = {}, opts) => api(path, { method: 'POST', body, ...opts });
export const put = (path, body = {}, opts) => api(path, { method: 'PUT', body, ...opts });
export const patch = (path, body = {}, opts) => api(path, { method: 'PATCH', body, ...opts });
export const del = (path, opts) => api(path, { method: 'DELETE', ...opts });

/** Load JSON on mount and whenever `key` changes. */
export function useFetch(path, query, enabled = true) {
  const [state, setState] = useState({ data: null, error: '', loading: enabled });
  const [tick, setTick] = useState(0);
  const key = path ? path + qs(query) : '';
  useEffect(() => {
    if (!enabled || !path) return undefined;
    const controller = new AbortController();
    setState((s) => ({ ...s, loading: true, error: '' }));
    api(path, { query, signal: controller.signal })
      .then((data) => setState({ data, error: '', loading: false }))
      .catch((e) => { if (e.name !== 'AbortError') setState((s) => ({ data: s.data, error: e.message, loading: false })); });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, tick, enabled]);
  const reload = useCallback(() => setTick((n) => n + 1), []);
  return { ...state, reload, setData: (data) => setState((s) => ({ ...s, data })) };
}

export function useDebounced(value, delay = 350) {
  const [v, setV] = useState(value);
  useEffect(() => { const t = setTimeout(() => setV(value), delay); return () => clearTimeout(t); }, [value, delay]);
  return v;
}

export function useLatest(value) { const r = useRef(value); r.current = value; return r; }
