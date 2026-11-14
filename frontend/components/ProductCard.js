'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useCart } from './CartContext';
import ProductVisual from './ProductVisual';
import Button from './ui/Button';
import Badge from './ui/Badge';
import { money } from '@/lib/format';

export default function ProductCard({ p }) {
  const { add } = useCart();
  const [done, setDone] = useState(false);
  const off = p.compare_at_price ? Math.round((1 - p.price / p.compare_at_price) * 100) : 0;

  const onAdd = () => {
    add({ variantId: p.variant_id, productId: p.id, slug: p.slug, name: p.name, label: p.variant_label, price: p.price, emoji: p.emoji, image: p.image_url }, 1);
    setDone(true);
    setTimeout(() => setDone(false), 1200);
  };

  return (
    <article className="flex flex-col rounded-card border border-line bg-white p-3">
      <Link href={`/products/${p.slug}`} className="flex-1">
        <div className="relative mb-3">
          <ProductVisual product={p} />
          {off > 0 && <Badge className="absolute left-2.5 top-2.5">{off}% off</Badge>}
        </div>
        <p className="text-[13px] text-muted">{p.category_name}</p>
        <h3 className="my-0.5 text-lg">{p.name}</h3>
        <p className="text-[13px] text-muted">{p.variant_label}{p.rating ? ` · ★ ${p.rating} (${p.review_count})` : ''}</p>
      </Link>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-lg font-bold">
          {money(p.price)}
          {p.compare_at_price && <s className="ml-1.5 text-[13px] font-normal text-muted">{money(p.compare_at_price)}</s>}
        </p>
        <Button size="sm" variant={done ? 'dark' : 'primary'} onClick={onAdd} disabled={p.stock < 1}>
          {p.stock < 1 ? 'Sold out' : done ? 'Added' : 'Add to cart'}
        </Button>
      </div>
    </article>
  );
}
