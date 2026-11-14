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
        <div className="thumbs">
          {imgs.map((im, k) => (
            <button key={im.url} className={k === i ? 'on' : ''} onClick={() => setI(k)} aria-label={`Show image ${k + 1}`}>
              <img src={im.url} alt={im.alt || product.name} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
