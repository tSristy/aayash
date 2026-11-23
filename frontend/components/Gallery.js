'use client';

import { useState } from 'react';
import CatalogImage from './CatalogImage';
import ProductVisual from './ProductVisual';

export default function Gallery({ product }) {
  const availableImages = product.images?.filter((image) => image.url) || [];
  const images = availableImages.length
    ? availableImages
    : product.image_url
      ? [{ url: product.image_url, alt: product.name }]
      : [];
  const [selected, setSelected] = useState(0);
  const current = {
    ...product,
    image_url: images[selected]?.url || product.image_url,
  };

  return (
    <div className="grid grid-cols-[64px_1fr] items-start gap-3.5 sm:grid-cols-[88px_1fr]">
      <div className="grid gap-3">
        {images.map((image, index) => (
          <button
            key={`${image.url}-${index}`}
            type="button"
            onClick={() => setSelected(index)}
            aria-label={`Show product photo ${index + 1}`}
            className={`aspect-square w-full overflow-hidden border bg-white transition-colors ${
              index === selected ? 'border-[#A65A3E]' : 'border-[#E2D9CE] hover:border-[#2E261F]'
            }`}
          >
            <CatalogImage
              src={image.url}
              alt={image.alt || `${product.name} photo ${index + 1}`}
              className="h-full w-full"
              imageClassName="object-cover"
            />
          </button>
        ))}
      </div>
      <ProductVisual product={current} large />
    </div>
  );
}
