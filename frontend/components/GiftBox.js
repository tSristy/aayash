import Link from 'next/link';
import CatalogImage from './CatalogImage';
import { GiftIcon } from './ui/Icons';
import { money } from '@/lib/format';

const thumb = (g) => (
  <li key={`${g.slug}-${g.label}`} className="flex w-[84px] flex-col items-center gap-1 text-center">
    <span className="block h-16 w-16 overflow-hidden rounded-lg border border-line bg-white"><CatalogImage src={g.image_url} alt={g.name} className="h-full w-full" imageClassName="object-cover" fallbackText="" /></span>
    <span className="line-clamp-2 text-[11px] leading-tight text-ink">{g.qty > 1 ? `${g.qty} × ` : ''}{g.name}</span>
  </li>
);

/** On a main product's page: the combo(s) that include free gifts. For a combo itself: what is inside. */
export default function GiftBox({ product }) {
  if (product.is_combo) {
    const main = product.combo_items?.filter((i) => i.role === 'main') || [];
    const gifts = product.combo_items?.filter((i) => i.role === 'gift') || [];
    if (!gifts.length) return null;
    return (
      <div className="mt-6 rounded-xl border border-dashed border-brown/40 bg-tint p-4">
        <p className="flex items-center gap-2 text-sm font-bold text-brown"><GiftIcon size={18} />What is in this combo</p>
        <ul className="mt-3 flex flex-wrap gap-3">{main.map(thumb)}<li className="self-center text-lg font-bold text-brown">+</li>{gifts.map(thumb)}</ul>
        <p className="mt-3 text-xs text-muted">The gifts are free with this pack.</p>
      </div>
    );
  }
  if (!product.combos?.length) return null;
  return (
    <>
      {product.combos.map((c) => (
        <div key={c.id} className="mt-6 rounded-xl border border-dashed border-brown/40 bg-tint p-4">
          <p className="flex items-center gap-2 text-sm font-bold text-brown"><GiftIcon size={18} />{c.gift_mode === 'with_main' ? 'Free gifts with this product' : 'Buy the combo and get these free'}</p>
          <ul className="mt-3 flex flex-wrap gap-3">{c.gifts.map(thumb)}</ul>
          {c.gift_mode === 'with_main'
            ? <p className="mt-3 text-xs text-muted">Added to your order automatically at no charge, while stock lasts.</p>
            : (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-brown/15 pt-3">
                <p className="text-sm text-ink"><b>{c.name}</b> · {money(c.price)}{c.compare_at_price ? <s className="ml-1.5 text-xs text-muted">{money(c.compare_at_price)}</s> : null}</p>
                <Link href={`/products/${c.slug}`} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-ink hover:bg-primary-hover">{c.stock < 1 ? 'See combo' : 'Get the combo'}</Link>
              </div>
            )}
        </div>
      ))}
    </>
  );
}
