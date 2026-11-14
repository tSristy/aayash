'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useCart } from './CartContext';
import ProductVisual from './ProductVisual';
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
    <article className="card">
      <Link href={`/products/${p.slug}`} className="card-link">
        <div className="card-visual">
          <ProductVisual product={p} />
          {off > 0 && <span className="badge">{off}% off</span>}
        </div>
        <p className="card-cat">{p.category_name}</p>
        <h3>{p.name}</h3>
        <p className="card-pack">{p.variant_label}{p.rating ? ` · ★ ${p.rating} (${p.review_count})` : ''}</p>
      </Link>
      <div className="card-foot">
        <p className="price">
          {money(p.price)}
          {p.compare_at_price && <s>{money(p.compare_at_price)}</s>}
        </p>
        <button className={`btn btn-sm${done ? ' btn-done' : ''}`} onClick={onAdd} disabled={p.stock < 1}>
          {p.stock < 1 ? 'Sold out' : done ? 'Added' : 'Add to cart'}
        </button>
      </div>
    </article>
  );
}
