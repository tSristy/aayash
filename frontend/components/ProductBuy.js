'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCart } from './CartContext';
import Button from './ui/Button';
import Badge from './ui/Badge';
import Stepper from './ui/Stepper';
import { money } from '@/lib/format';

const label = 'mb-2 text-xs font-semibold uppercase tracking-widest text-stone-500';
const PHONE = '+8801700000000';
const WA_NUMBER = '8801700000000';

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

  const waText = encodeURIComponent(`Hi Aayash E-Mart, I want to order: ${product.name} (${v.label}) × ${qty} — ${money(v.price * qty)}`);

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
      <p className="flex flex-wrap items-baseline gap-2 font-serif text-[34px] font-normal text-[#2E261F]">
        {money(v.price)}
        <small className="font-sans text-sm font-normal text-stone-500">/ {v.label}</small>
        {v.compare_at_price && <s className="font-sans text-base font-normal text-stone-400">{money(v.compare_at_price)}</s>}
        {off > 0 && <Badge>{off}% off</Badge>}
      </p>
      <p className="mb-[18px] text-xs text-stone-500">Inclusive of VAT · Free delivery over ৳1,000</p>
      <p className="mb-6 max-w-[56ch] text-sm leading-relaxed text-stone-600">{product.description}</p>

      <p className={label} id="pack-label">Pack size</p>
      <div className="mb-[22px] flex flex-wrap gap-2.5" role="radiogroup" aria-labelledby="pack-label">
        {product.variants.map((x, k) => (
          <button key={x.id} role="radio" aria-checked={k === vi} disabled={x.stock < 1}
            onClick={() => { setVi(k); setQty(1); }}
            className={`border px-4 py-2.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${k === vi ? 'border-[#A65A3E] bg-[#F5F1EB] font-semibold text-[#2E261F]' : 'border-[#E2D9CE] bg-white text-stone-700 hover:border-[#2E261F]'}`}>
            {x.label}
          </button>
        ))}
      </div>

      <p className={label}>Quantity</p>
      <div className="mb-6 flex flex-wrap items-center gap-5">
        <Stepper value={qty} onChange={setQty} max={v.stock || 1} />
        <p className="text-sm text-stone-500">Total: <strong className="font-semibold text-[#2E261F]">{money(v.price * qty)}</strong></p>
        <p className={`text-xs font-semibold uppercase tracking-wider ${inStock ? 'text-emerald-700' : 'text-[#A65A3E]'}`}>
          {inStock ? (v.stock < 10 ? `Only ${v.stock} left` : 'In stock') : 'Out of stock'}
        </p>
      </div>

      <div className="mb-3 grid max-w-[480px] grid-cols-[1.4fr_1fr] gap-3">
        <Button size="lg" variant={added ? 'dark' : 'primary'} onClick={onAdd} disabled={!inStock}>{added ? 'Added to cart' : 'Add to cart'}</Button>
        <Button size="lg" variant="outline" onClick={onBuy} disabled={!inStock}>Buy now</Button>
      </div>

      <div className="mb-3 grid max-w-[480px] grid-cols-[1.4fr_1fr] gap-3">
        <a href={`https://wa.me/${WA_NUMBER}?text=${waText}`} target="_blank" rel="noreferrer"
          className="inline-flex items-center justify-center gap-2 border border-[#E2D9CE] bg-white px-4 py-3 text-xs font-semibold uppercase tracking-widest text-[#2E261F] transition-colors hover:border-[#2E261F] ">
          Order on WhatsApp
        </a>
        <a href={`tel:${PHONE}`}
          className="inline-flex items-center justify-center gap-2 border border-[#E2D9CE] bg-white px-4 py-3 text-xs font-semibold uppercase tracking-widest text-[#2E261F] transition-colors hover:border-[#2E261F]">
          Call for Order
        </a>
      </div>

      <div className="flex max-w-[480px] gap-6 border-t border-[#E2D9CE] pt-4 text-xs font-medium uppercase tracking-wider text-stone-500">
        <button onClick={() => setLiked(!liked)} aria-pressed={liked} className="hover:text-[#A65A3E]">{liked ? '♥ Saved' : '♡ Save for later'}</button>
        <button onClick={onShare} className="hover:text-[#A65A3E]">{shared ? 'Link copied' : 'Share'}</button>
      </div>
    </div>
  );
}