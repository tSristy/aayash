'use client';
import { useState } from 'react';
import ProductVisual from './ProductVisual';

export default function Gallery({ product }) {
  const imgs = product.images?.length ? product.images : [];
  const [i, setI] = useState(0);
  const current = imgs[i] ? { ...product, image_url: imgs[i].url } : product;
  return (
    <div>
      <ProductVisual product={current} large />
      {imgs.length > 1 && (
        <div className="mt-3 flex gap-2.5">
          {imgs.map((im, k) => (
            <button key={im.url} onClick={() => setI(k)} aria-label={`Show image ${k + 1}`}
              className={`h-[76px] w-[76px] overflow-hidden rounded-xl border-2 p-0 ${k === i ? 'border-primary' : 'border-transparent'}`}>
              <img src={im.url} alt={im.alt || product.name} className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
