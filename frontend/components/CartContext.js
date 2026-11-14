'use client';
import { createContext, useContext, useEffect, useReducer, useState } from 'react';

const Ctx = createContext(null);

function reducer(state, a) {
  switch (a.type) {
    case 'load': return a.items;
    case 'add': {
      const found = state.find((x) => x.variantId === a.item.variantId);
      if (found) return state.map((x) => (x.variantId === found.variantId ? { ...x, qty: x.qty + a.qty } : x));
      return [...state, { ...a.item, qty: a.qty }];
    }
    case 'qty': return state.map((x) => (x.variantId === a.id ? { ...x, qty: Math.max(1, a.qty) } : x));
    case 'remove': return state.filter((x) => x.variantId !== a.id);
    case 'clear': return [];
    default: return state;
  }
}

export function CartProvider({ children }) {
  const [items, dispatch] = useReducer(reducer, []);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try { dispatch({ type: 'load', items: JSON.parse(localStorage.getItem('aem-cart') || '[]') }); } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) try { localStorage.setItem('aem-cart', JSON.stringify(items)); } catch {}
  }, [items, ready]);

  const value = {
    items, ready,
    count: items.reduce((n, i) => n + i.qty, 0),
    subtotal: items.reduce((n, i) => n + i.qty * i.price, 0),
    add: (item, qty = 1) => dispatch({ type: 'add', item, qty }),
    setQty: (id, qty) => dispatch({ type: 'qty', id, qty }),
    remove: (id) => dispatch({ type: 'remove', id }),
    clear: () => dispatch({ type: 'clear' }),
  };
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useCart = () => useContext(Ctx);
