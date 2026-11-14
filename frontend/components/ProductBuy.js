'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCart } from './CartContext';
import Button from './ui/Button';
import Badge from './ui/Badge';
import Stepper from './ui/Stepper';
import { money } from '@/lib/format';

const label = 'mb-2 text-sm font-bold';

export default function ProductBuy({ product }) {
  const router = useRouter();
  const { add } = useCart();
  const [vi, setVi] = useState(Math.max(0, product.variants.findIndex((v) => v.is_default)));
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [liked, setLiked] = useState(false);
  const [shared, setShared] = useState(false);
  const v = product.variants[vi];
  const inStock = v.stock > 0;
  const off = v.compare_at_price ? Math.round((1 - v.price / v.compare_at_price) * 100) : 0;

  const addToCart = () => {
    add({ variantId: v.id, productId: product.id, slug: product.slug, name: product.name, label: v.label, price: v.price, emoji: product.emoji, image: product.image_url }, qty);
  };
  const onAdd = () => { addToCart(); setAdded(true); setTimeout(() => setAdded(false), 1400); };
  const onBuy = () => { addToCart(); router.push('/cart'); };
  const onShare = async () => {
    try {
      if (navigator.share) await navigator.share({ title: product.name, url: location.href });
      else { await navigator.clipboard.writeText(location.href); setShared(true); setTimeout(() => setShared(false), 1500); }
    } catch {}
  };

  return (
    <div>
      <p className="flex flex-wrap items-baseline gap-2 font-display text-[34px] font-extrabold">
        {money(v.price)}
        <small className="font-sans text-base font-medium text-muted">/ {v.label}</small>
        {v.compare_at_price && <s className="font-sans text-lg font-normal text-muted">{money(v.compare_at_price)}</s>}
        {off > 0 && <Badge className="font-sans">{off}% off</Badge>}
      </p>
      <p className="mb-[18px] text-sm text-muted">Inclusive of VAT · Free delivery over ৳1,000</p>
      <p className="mb-6 max-w-[56ch] text-muted">{product.description}</p>

      <p className={label} id="pack-label">Pack size</p>
      <div className="mb-[22px] flex flex-wrap gap-2.5" role="radiogroup" aria-labelledby="pack-label">
        {product.variants.map((x, k) => (
          <button key={x.id} role="radio" aria-checked={k === vi} disabled={x.stock < 1}
            onClick={() => { setVi(k); setQty(1); }}
            className={`rounded-xl border-2 bg-white px-[18px] py-2.5 disabled:cursor-not-allowed disabled:opacity-40 ${k === vi ? 'border-primary font-bold' : 'border-line font-medium'}`}>
            {x.label}
          </button>
        ))}
      </div>

      <p className={label}>Quantity</p>
      <div className="mb-6 flex flex-wrap items-center gap-5">
        <Stepper value={qty} onChange={setQty} max={v.stock || 1} />
        <p className="text-muted">Total: <strong className="text-ink">{money(v.price * qty)}</strong></p>
        <p className={`text-sm font-medium ${inStock ? 'text-success' : 'text-danger'}`}>
          {inStock ? (v.stock < 10 ? `Only ${v.stock} left` : 'In stock') : 'Out of stock'}
        </p>
      </div>

      <div className="mb-[18px] grid max-w-[480px] grid-cols-[1.4fr_1fr] gap-3">
        <Button size="lg" variant={added ? 'dark' : 'primary'} onClick={onAdd} disabled={!inStock}>{added ? 'Added to cart' : 'Add to cart'}</Button>
        <Button size="lg" variant="outline" onClick={onBuy} disabled={!inStock}>Buy now</Button>
      </div>

      <div className="flex max-w-[480px] gap-5 border-t border-line pt-4 text-muted">
        <button onClick={() => setLiked(!liked)} aria-pressed={liked} className="hover:text-ink">{liked ? '♥ Saved' : '♡ Save for later'}</button>
        <button onClick={onShare} className="hover:text-ink">{shared ? 'Link copied' : 'Share'}</button>
      </div>
    </div>
  );
}
