'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useCart } from './CartContext';
import CatalogImage from './CatalogImage';
import HeartButton from './HeartButton';
import Badge from './ui/Badge';
import { CheckIcon, PlusIcon } from './ui/Icons';
import { money } from '@/lib/format';

export default function ProductCard({ p }) {
  const { add } = useCart();
  const [done, setDone] = useState(false);
  const off = p.compare_at_price ? Math.round((1 - p.price / p.compare_at_price) * 100) : 0;
  const soldOut = p.stock < 1;

  const onAdd = () => {
    add({ variantId: p.variant_id, productId: p.id, slug: p.slug, name: p.name, label: p.variant_label, price: p.price, emoji: p.emoji, image: p.image_url }, 1);
    setDone(true);
    setTimeout(() => setDone(false), 1200);
  };

  return (
    <article className="group flex flex-col rounded-xl border border-line bg-white p-2.5 transition-colors hover:border-ink/40 sm:p-3">
      <div className="relative">
        <Link href={`/products/${p.slug}`} className="block aspect-square overflow-hidden rounded-lg bg-tint" aria-label={p.name}>
          <CatalogImage src={p.image_url} alt={p.name} className="h-full w-full transition-transform duration-300 group-hover:scale-105" imageClassName="object-cover" />
        </Link>
        <div className="absolute left-2 top-2 flex flex-col items-start gap-1">
          {p.is_combo ? <Badge>Hot combo</Badge> : off > 0 && <Badge>{off}% off</Badge>}
          {soldOut && <Badge tone="brown">Sold out</Badge>}
        </div>
        <HeartButton product={p} className="absolute right-2 top-2" />
      </div>
      <Link href={`/products/${p.slug}`} className="mt-3 flex-1">
        {p.brand_name && <p className="text-[11px] font-medium uppercase tracking-wide text-muted">{p.brand_name}</p>}
        <h3 className="mt-0.5 line-clamp-2 text-sm font-medium leading-snug text-ink sm:text-[15px]">{p.name}</h3>
        <p className="mt-1 text-xs text-muted">{p.variant_label}{p.rating ? ` · ★ ${p.rating} (${p.review_count})` : ''}</p>
      </Link>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-base font-bold text-ink">
          {money(p.price)}
          {p.compare_at_price && <s className="ml-1.5 text-xs font-normal text-muted">{money(p.compare_at_price)}</s>}
        </p>
        <button type="button" onClick={onAdd} disabled={soldOut} aria-label={soldOut ? 'Sold out' : `Add ${p.name} to cart`}
          className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${done ? 'border-brown bg-brown text-white' : 'border-primary bg-primary text-ink hover:bg-primary-hover'}`}>
          {done ? <CheckIcon size={18} /> : <PlusIcon size={18} />}
        </button>
      </div>
    </article>
  );
}
