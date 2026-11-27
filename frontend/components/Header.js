'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCart } from './CartContext';
import { useWishlist } from './WishlistContext';
import Container from './ui/Container';
import { CartIcon, HeartIcon, SearchIcon, UserIcon } from './ui/Icons';
import { useSite } from './SiteContext';
import { money } from '@/lib/format';

const iconLink = 'relative flex flex-col items-center gap-0.5 text-ink hover:text-brown';

export default function Header({ categories = [] }) {
  const router = useRouter();
  const path = usePathname();
  const { count } = useCart();
  const wish = useWishlist();
  const [q, setQ] = useState('');
  const site = useSite();
  const s = site.settings;
  const logo = s.logo_url || '/logo.png';
  const free = Number(s.free_delivery_min_order) > 0 ? `Free delivery on orders over ${money(s.free_delivery_min_order)}` : 'Fresh food delivered to your door';

  // Category row: database categories first, then Brands and Hot Deals, then anything extra added in Admin → Menus.
  const parentIds = new Set(categories.map((c) => Number(c.parent_id)).filter(Boolean));
  const top = categories.filter((c) => Number(c.product_count) > 0 && (!parentIds.has(Number(c.id)) || Number(c.own_product_count) > 0)).slice(0, 7);
  const links = [
    ...top.map((c) => ({ href: `/products?category=${c.slug}`, label: c.name })),
    { href: '/brands', label: 'Brands' },
    { href: '/deals', label: 'Hot Deals', hot: true },
  ];
  const seen = new Set(links.map((l) => l.href).concat(['/', '/products', '/products?deal=1', '/orders/tracking', '/contact']));
  for (const m of site.menus.header) { if (!seen.has(m.url)) { seen.add(m.url); links.push({ href: m.url, label: m.label, hot: /deal/i.test(m.url) }); } }

  const search = (e) => {
    e.preventDefault();
    router.push(q.trim() ? `/products?q=${encodeURIComponent(q.trim())}` : '/products');
  };

  return (
    <header className="sticky top-0 z-30 bg-white">
      <div className="bg-tint text-xs text-ink">
        <Container className="flex items-center justify-between gap-4 py-1.5">
          <p className="truncate"><span className="font-medium text-brown">{free}</span>{s.delivery_area_text ? <span className="hidden text-muted sm:inline"> · {s.delivery_area_text}</span> : null}</p>
          <p className="flex shrink-0 items-center gap-4">
            <Link href="/orders/tracking" className="hover:text-brown hover:underline">Track order</Link>
            <Link href="/contact" className="hover:text-brown hover:underline">Help</Link>
          </p>
        </Container>
      </div>
      <div className="border-b border-line">
        <Container className="flex flex-wrap items-center gap-x-4 gap-y-3 py-3 md:flex-nowrap md:gap-x-8">
          <Link href="/" aria-label="Aayash E-Mart home" className="shrink-0">
            <img src={logo} alt={s.site_name || 'Aayash E-Mart'} className="block h-11 w-auto sm:h-[50px]" />
          </Link>
          <form onSubmit={search} role="search" className="order-3 flex basis-full overflow-hidden rounded-lg border border-line bg-white focus-within:border-brown md:order-none md:basis-auto md:flex-1">
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search rice, fish, milk…" aria-label="Search products"
              className="min-w-0 flex-1 bg-transparent px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:outline-none" />
            <button type="submit" aria-label="Search" className="flex items-center gap-2 bg-brown px-5 text-sm font-semibold text-white transition-colors hover:bg-ink">
              <SearchIcon size={18} /><span className="hidden sm:inline">Search</span>
            </button>
          </form>
          <nav className="ml-auto flex items-center gap-5 text-[11px] font-medium md:ml-0" aria-label="Account and cart">
            <Link href="/account" className={`${iconLink} hidden sm:flex`}><UserIcon size={22} />Account</Link>
            <Link href="/wishlist" className={iconLink} aria-label={`Wishlist, ${wish.count} saved`}>
              <HeartIcon size={22} />Wishlist
              {wish.count > 0 && <span className="absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-brown px-1 text-[10px] font-bold text-white">{wish.count}</span>}
            </Link>
            <Link href="/cart" className={iconLink} aria-label={`Cart, ${count} items`}>
              <CartIcon size={22} />Cart
              {count > 0 && <span className="absolute -right-2 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-bold text-ink">{count}</span>}
            </Link>
          </nav>
        </Container>
      </div>
      <div className="border-b border-line bg-white">
        <Container>
          <nav className="-mx-1 flex gap-1 overflow-x-auto py-1 text-sm font-medium [scrollbar-width:none]" aria-label="Categories">
            <Link href="/products" className={`whitespace-nowrap rounded-md px-3 py-2 hover:bg-tint ${path === '/products' ? 'text-brown' : 'text-ink'}`}>All products</Link>
            {links.map((l) => (
              <Link key={l.href + l.label} href={l.href} className="relative flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 text-ink hover:bg-tint">
                {l.label}
                {l.hot && <span className="rounded bg-accent px-1.5 py-px text-[10px] font-bold uppercase leading-4 text-ink">Hot</span>}
              </Link>
            ))}
          </nav>
        </Container>
      </div>
    </header>
  );
}
