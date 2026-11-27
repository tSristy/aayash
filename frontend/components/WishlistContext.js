'use client';
import { createContext, useContext, useEffect, useState } from 'react';

const Ctx = createContext({ items: [], count: 0, has: () => false, toggle: () => {}, remove: () => {} });
const KEY = 'aem-wishlist';

/** Saved products live in this browser only (localStorage). No login needed. */
export function WishlistProvider({ children }) {
  const [items, setItems] = useState([]);
  const [ready, setReady] = useState(false);
  useEffect(() => { try { setItems(JSON.parse(localStorage.getItem(KEY) || '[]')); } catch { /* ignore */ } setReady(true); }, []);
  useEffect(() => { if (ready) try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* ignore */ } }, [items, ready]);
  const snap = (p) => ({ id: p.id, slug: p.slug, name: p.name, image: p.image_url || p.image || null, price: Number(p.price), compare: p.compare_at_price ? Number(p.compare_at_price) : null, label: p.variant_label || p.label || '', variantId: p.variant_id || p.variantId, stock: p.stock });
  const value = {
    items, count: items.length, ready,
    has: (id) => items.some((x) => x.id === id),
    toggle: (p) => setItems((list) => (list.some((x) => x.id === p.id) ? list.filter((x) => x.id !== p.id) : [snap(p), ...list])),
    remove: (id) => setItems((list) => list.filter((x) => x.id !== id)),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useWishlist = () => useContext(Ctx);
