import Link from 'next/link';
import CatalogImage from './CatalogImage';
import HeartButton from './HeartButton';
import Badge from './ui/Badge';
import { GiftIcon } from './ui/Icons';
import { money } from '@/lib/format';

/** A combo: one main product plus free gifts. Shown on Hot Deals and the home page. */
export default function DealCard({ p }) {
  const main = (p.items || []).find((i) => i.role === 'main');
  const gifts = (p.items || []).filter((i) => i.role === 'gift');
  const off = p.compare_at_price ? Math.round((1 - p.price / p.compare_at_price) * 100) : 0;
  return (
    <article className="group flex flex-col rounded-xl border border-line bg-white p-3">
      <div className="relative">
        <Link href={`/products/${p.slug}`} className="block aspect-[4/3] overflow-hidden rounded-lg bg-tint" aria-label={p.name}>
          <CatalogImage src={p.image_url} alt={p.name} className="h-full w-full transition-transform duration-300 group-hover:scale-105" imageClassName="object-cover" />
        </Link>
        <div className="absolute left-2 top-2 flex gap-1"><Badge>Hot</Badge>{off > 0 && <Badge tone="brown">{off}% off</Badge>}</div>
        <HeartButton product={p} className="absolute right-2 top-2" />
      </div>
      <Link href={`/products/${p.slug}`} className="mt-3 flex-1">
        <h3 className="line-clamp-2 text-base font-semibold text-ink">{p.name}</h3>
        {main && <p className="mt-1 text-sm text-muted">{main.qty > 1 ? `${main.qty} × ` : ''}{main.name}</p>}
        {gifts.length > 0 && (
          <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-tint px-2.5 py-2 text-xs text-brown">
            <GiftIcon size={16} className="mt-px shrink-0" />
            <span><b>Free:</b> {gifts.map((g) => `${g.qty > 1 ? `${g.qty} × ` : ''}${g.name}`).join(', ')}</span>
          </p>
        )}
      </Link>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-lg font-bold text-ink">{money(p.price)}{p.compare_at_price && <s className="ml-1.5 text-xs font-normal text-muted">{money(p.compare_at_price)}</s>}</p>
        <Link href={`/products/${p.slug}`} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-ink hover:bg-primary-hover">{p.stock < 1 ? 'Sold out' : 'Get the deal'}</Link>
      </div>
    </article>
  );
}
