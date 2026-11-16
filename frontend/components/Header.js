'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCart } from './CartContext';
import Container from './ui/Container';

export default function Header() {
  const router = useRouter();
  const { count } = useCart();
  const [q, setQ] = useState('');

  const search = (e) => {
    e.preventDefault();
    router.push(q.trim() ? `/products?q=${encodeURIComponent(q.trim())}` : '/products');
  };

  return (
    <header className="sticky top-0 z-20 border-b border-[#E2D9CE] bg-[#FAF8F5]/95 backdrop-blur">
      <Container className="flex flex-wrap items-center gap-x-7 gap-y-2.5 py-2.5 md:h-[76px] md:flex-nowrap md:py-0">
        <Link href="/" aria-label="Aayash E-Mart home">
          <img src="/logo.png" alt="Aayash E-Mart" className="block h-[52px] w-auto" />
        </Link>

        <nav className="hidden gap-6 text-xs font-semibold uppercase tracking-widest text-[#2E261F] md:flex" aria-label="Main">
          {[['/', 'Home'], ['/products', 'Shop all'], ['/products?deal=1', 'Deals']].map(([href, label]) => (
            <Link key={label} href={href} className="border-b-2 border-transparent py-1.5 transition-colors hover:border-[#A65A3E] hover:text-[#A65A3E]">
              {label}
            </Link>
          ))}
        </nav>

        <form onSubmit={search} role="search"
          className="order-3 flex basis-full overflow-hidden rounded-none border border-[#E2D9CE] bg-white focus-within:border-[#A65A3E] md:order-none md:ml-auto md:max-w-[420px] md:flex-1 md:basis-auto">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search rice, fish, milk…" aria-label="Search products"
            className="min-w-0 flex-1 bg-transparent px-3.5 py-2.5 text-sm text-[#2E261F] placeholder:text-stone-400 focus:outline-none" />
          <button type="submit" aria-label="Search" className="px-3.5 text-[#2E261F] transition-colors hover:text-[#A65A3E]">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          </button>
        </form>

        <Link href="/cart" className="relative ml-auto grid h-11 w-11 place-items-center rounded-full bg-[#A65A4E] text-white transition-colors hover:bg-[#955110] md:ml-0" aria-label={`Cart, ${count} items`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 4h2l2.4 11.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 8H6.2" /><circle cx="9.5" cy="20" r="1.2" /><circle cx="17" cy="20" r="1.2" /></svg>
          {count > 0 && (
            <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#A65A3E] px-1.5 text-xs font-bold text-white">{count}</span>
          )}
        </Link>
      </Container>
    </header>
  );
}