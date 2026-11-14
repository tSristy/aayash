'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCart } from './CartContext';
import { money } from '@/lib/format';

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
      <p className="pdp-price">
        {money(v.price)} <small>/ {v.label}</small>
        {v.compare_at_price && <s>{money(v.compare_at_price)}</s>}
        {off > 0 && <span className="badge badge-inline">{off}% off</span>}
      </p>
      <p className="pdp-note">Inclusive of VAT · Free delivery over ৳1,000</p>

      <p className="pdp-desc">{product.description}</p>

      <p className="field-label" id="pack-label">Pack size</p>
      <div className="chips" role="radiogroup" aria-labelledby="pack-label">
        {product.variants.map((x, k) => (
          <button key={x.id} role="radio" aria-checked={k === vi} disabled={x.stock < 1}
            className={`chip${k === vi ? ' on' : ''}`} onClick={() => { setVi(k); setQty(1); }}>
            {x.label}
          </button>
        ))}
      </div>

      <p className="field-label">Quantity</p>
      <div className="qty-row">
        <div className="stepper">
          <button onClick={() => setQty(Math.max(1, qty - 1))} aria-label="Decrease quantity">−</button>
          <span aria-live="polite">{qty}</span>
          <button onClick={() => setQty(Math.min(v.stock || 1, qty + 1))} aria-label="Increase quantity">+</button>
        </div>
        <p className="est">Total: <strong>{money(v.price * qty)}</strong></p>
        <p className={`stock${inStock ? '' : ' out'}`}>{inStock ? (v.stock < 10 ? `Only ${v.stock} left` : 'In stock') : 'Out of stock'}</p>
      </div>

      <div className="buy-row">
        <button className={`btn btn-lg${added ? ' btn-done' : ''}`} onClick={onAdd} disabled={!inStock}>{added ? 'Added to cart' : 'Add to cart'}</button>
        <button className="btn btn-lg btn-outline" onClick={onBuy} disabled={!inStock}>Buy now</button>
      </div>

      <div className="pdp-links">
        <button onClick={() => setLiked(!liked)} aria-pressed={liked}>{liked ? '♥ Saved' : '♡ Save for later'}</button>
        <button onClick={onShare}>{shared ? 'Link copied' : 'Share'}</button>
      </div>
    </div>
  );
}
