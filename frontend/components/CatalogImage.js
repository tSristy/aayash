'use client';

import { useEffect, useState } from 'react';

/** A real uploaded/catalog photo, or an honest placeholder when none exists. */
export default function CatalogImage({
  src,
  alt,
  className = '',
  imageClassName = '',
  fallbackText = 'Photo coming soon',
}) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (src && !failed) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`${className} ${imageClassName}`}
      />
    );
  }

  return (
    <div
      className={`${className} flex flex-col items-center justify-center gap-2 bg-[#EAE4DC] px-3 text-center text-stone-500`}
      role="img"
      aria-label={`${alt}: no image available`}
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        aria-hidden="true"
      >
        <rect x="3" y="4" width="18" height="16" rx="1" />
        <circle cx="8.5" cy="9" r="1.5" />
        <path d="m4 17 5-5 3.5 3.5 2.5-2.5 5 5" />
      </svg>
      <span className="text-[10px] font-medium uppercase tracking-wider">
        {fallbackText}
      </span>
    </div>
  );
}
