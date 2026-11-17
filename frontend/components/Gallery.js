'use client';
import { useState } from 'react';
import ProductVisual from './ProductVisual';

const ANGLES = ['Front', 'Side', 'Pack', 'Detail'];

export default function Gallery({ product }) {
  const imgs = product.images?.length ? product.images : [];
  const slots = imgs.length ? imgs : ANGLES.map((label) => ({ label, url: product.image_url || '' }));
  const [i, setI] = useState(0);
  const current = slots[i]?.url ? { ...product, image_url: slots[i].url } : product;

  return (
    <div className="grid grid-cols-[76px_1fr] items-start gap-3.5 sm:grid-cols-[88px_1fr]">
      <div className="grid gap-3">
        {slots.map((im, k) => (
          <button key={k} type="button" onClick={() => setI(k)} aria-label={`Show view ${k + 1}`}
            className={`grid aspect-square w-full place-items-center overflow-hidden border bg-white p-0 transition-colors ${k === i ? 'border-[#A65A3E]' : 'border-[#E2D9CE] hover:border-[#2E261F]'}`}>
            {im.url
              ? <img src={im.url} alt={im.alt || `${product.name} ${im.label || k + 1}`} className="h-full w-full object-cover" />
              : <span className="text-3xl">{product.emoji}</span>}
          </button>
        ))}
      </div>
      <ProductVisual product={current} large />
    </div>
  );
}