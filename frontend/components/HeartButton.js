'use client';
import { useWishlist } from './WishlistContext';
import { HeartIcon } from './ui/Icons';

export default function HeartButton({ product, className = '', size = 18 }) {
  const { has, toggle } = useWishlist();
  const on = has(product.id);
  return (
    <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(product); }} aria-pressed={on} aria-label={on ? 'Remove from wishlist' : 'Add to wishlist'}
      className={`grid h-8 w-8 place-items-center rounded-full border border-line bg-white/95 transition-colors hover:border-ink ${on ? 'text-red-600' : 'text-ink'} ${className}`}>
      <HeartIcon size={size} filled={on} />
    </button>
  );
}
