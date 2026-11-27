'use client';
import Link from 'next/link';
import { useWishlist } from '@/components/WishlistContext';
import { useCart } from '@/components/CartContext';
import CatalogImage from '@/components/CatalogImage';
import Button from '@/components/ui/Button';
import { Section, PageTitle } from '@/components/ui/Section';
import { money } from '@/lib/format';

export default function Wishlist() {
  const { items, remove, ready } = useWishlist();
  const { add } = useCart();
  return (
    <Section className="pt-6 sm:pt-8">
      <PageTitle>Your wishlist</PageTitle>
      <p className="-mt-3 mb-6 text-sm text-muted">Saved on this device only. No account needed.</p>
      {ready && items.length === 0 ? (
        <div className="rounded-xl border border-line p-10 text-center">
          <p className="font-semibold text-brown">Nothing saved yet.</p>
          <p className="mt-1 text-sm text-muted">Tap the heart on any product to keep it here.</p>
          <Button href="/products" className="mt-5">Browse products</Button>
        </div>
      ) : (
        <ul className="grid gap-3">
          {items.map((p) => (
            <li key={p.id} className="flex items-center gap-4 rounded-xl border border-line p-3 sm:p-4">
              <Link href={`/products/${p.slug}`} className="block h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-tint"><CatalogImage src={p.image} alt={p.name} className="h-full w-full" imageClassName="object-cover" /></Link>
              <div className="min-w-0 flex-1">
                <Link href={`/products/${p.slug}`} className="line-clamp-2 font-medium text-ink hover:underline">{p.name}</Link>
                <p className="text-xs text-muted">{p.label}</p>
                <p className="mt-1 font-bold">{money(p.price)}{p.compare && <s className="ml-1.5 text-xs font-normal text-muted">{money(p.compare)}</s>}</p>
              </div>
              <div className="flex flex-col items-end gap-2 sm:flex-row">
                <Button size="sm" disabled={p.stock < 1} onClick={() => add({ variantId: p.variantId, productId: p.id, slug: p.slug, name: p.name, label: p.label, price: p.price, image: p.image }, 1)}>{p.stock < 1 ? 'Sold out' : 'Add to cart'}</Button>
                <button onClick={() => remove(p.id)} className="text-xs text-muted underline hover:text-ink">Remove</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}
