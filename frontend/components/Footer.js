'use client';
import Link from 'next/link';
import Container from './ui/Container';
import { useSite } from './SiteContext';

const headingCls = 'mb-3 text-sm font-semibold text-white';
const linkCls = 'mb-2 block text-sm text-white/70 transition-colors hover:text-white';

export default function Footer() {
  const { settings: s, menus, footerPages } = useSite();
  const shown = new Set(['/products', '/products?deal=1', '/deals', '/brands', '/wishlist', '/cart', '/orders/tracking']);
  const helpLinks = [...footerPages.map((p) => ({ url: `/pages/${p.slug}`, label: p.title })), ...menus.footer.map((m) => ({ url: m.url, label: m.label })), { url: '/contact', label: 'Contact us' }]
    .filter((l) => (shown.has(l.url) || shown.has(`t:${l.label}`) ? false : (shown.add(l.url), shown.add(`t:${l.label}`), true)));
  const socials = [['Facebook', s.social_facebook], ['Instagram', s.social_instagram], ['YouTube', s.social_youtube], ['WhatsApp', s.social_whatsapp && (/^https?:/.test(s.social_whatsapp) ? s.social_whatsapp : `https://wa.me/${String(s.social_whatsapp).replace(/\D/g, '')}`)]].filter(([, u]) => u);
  return (
    <footer className="mt-16 bg-footer pb-6 pt-12 text-white">
      <Container className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
        <div>
          <p className="mb-2 text-xl font-bold text-white">{s.site_name || 'Aayash E-Mart'}</p>
          <p className="max-w-[34ch] text-sm leading-relaxed text-white/70">{s.footer_about || s.site_tagline || 'Everything you need, all in one place.'}</p>
          {socials.length > 0 && <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-sm">{socials.map(([n, u]) => <a key={n} href={u} target="_blank" rel="noopener noreferrer" className="text-white/80 underline-offset-4 hover:text-white hover:underline">{n}</a>)}</p>}
        </div>
        <div>
          <h4 className={headingCls}>Shop</h4>
          <Link className={linkCls} href="/products">All products</Link>
          <Link className={linkCls} href="/deals">Hot Deals</Link>
          <Link className={linkCls} href="/brands">Brands</Link>
          <Link className={linkCls} href="/wishlist">Wishlist</Link>
          <Link className={linkCls} href="/cart">Your cart</Link>
          <Link className={linkCls} href="/orders/tracking">Order tracking</Link>
        </div>
        <div>
          <h4 className={headingCls}>Help</h4>
          {helpLinks.map((l) => <Link key={l.url} className={linkCls} href={l.url}>{l.label}</Link>)}
        </div>
        <div>
          <h4 className={headingCls}>Contact</h4>
          {s.contact_address && <p className="mb-2 text-sm text-white/70">{s.contact_address}</p>}
          {s.contact_phone && <p className="mb-2 text-sm text-white/70"><a href={`tel:${s.contact_phone}`}>{s.contact_phone}</a></p>}
          {s.contact_email && <p className="mb-2 text-sm text-white/70"><a href={`mailto:${s.contact_email}`}>{s.contact_email}</a></p>}
        </div>
      </Container>
      <Container className="mt-10 border-t border-white/15 pt-5 text-xs text-white/60">
        {s.footer_copyright || `© ${new Date().getFullYear()} ${s.site_name || 'Aayash E-Mart'}`}
      </Container>
    </footer>
  );
}
