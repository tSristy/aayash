'use client';
import { useEffect } from 'react';
import { track } from './Pixel';

/** Counts a product view (for the admin "Product views" report) and fires the pixel's ViewContent. */
export default function ProductView({ slug, id, name, price }) {
  useEffect(() => {
    fetch(`/api/products/${encodeURIComponent(slug)}/view`, { method: 'POST' }).catch(() => {});
    const t = setTimeout(() => track('ViewContent', { content_ids: [String(id)], content_name: name, content_type: 'product', value: price, currency: 'BDT' }), 600);
    return () => clearTimeout(t);
  }, [slug]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}
