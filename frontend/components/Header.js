'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCart } from './CartContext';

export default function Header() {
  const router = useRouter();
  const { count } = useCart();
  const [q, setQ] = useState('');

  const search = (e) => {
    e.preventDefault();
    router.push(q.trim() ? `/products?q=${encodeURIComponent(q.trim())}` : '/products');
  };

  return (
    <header className="header">
      <div className="wrap header-row">
        <Link href="/" className="logo" aria-label="Aayash E-Mart home">
          <img src="/logo.png" alt="Aayash E-Mart" />
        </Link>
        <nav className="nav" aria-label="Main">
          <Link href="/">Home</Link>
          <Link href="/products">Shop all</Link>
          <Link href="/products?deal=1">Deals</Link>
        </nav>
        <form className="search" onSubmit={search} role="search">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search rice, fish, milk…" aria-label="Search products" />
          <button type="submit" aria-label="Search">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          </button>
        </form>
        <Link href="/cart" className="cart-link" aria-label={`Cart, ${count} items`}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 8H6.2" /><circle cx="9.5" cy="20" r="1.2" /><circle cx="17" cy="20" r="1.2" /></svg>
          {count > 0 && <span className="cart-count">{count}</span>}
        </Link>
      </div>
    </header>
  );
}
