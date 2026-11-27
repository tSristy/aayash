import Link from 'next/link';
import { Section, SectionHead } from './ui/Section';

export function BrandTile({ b }) {
  return (
    <Link href={`/products?brand=${b.slug}`} className="flex h-20 items-center justify-center rounded-xl border border-line bg-white p-3 transition-colors hover:border-brown sm:h-24" title={b.name}>
      {b.logo_url ? <img src={b.logo_url} alt={b.name} className="max-h-full max-w-full object-contain" loading="lazy" /> : <span className="text-center text-sm font-semibold text-brown">{b.name}</span>}
    </Link>
  );
}

/** Brand logos on the home page. Hidden when there are no brands with products. */
export default function BrandRow({ brands }) {
  if (!brands.length) return null;
  return (
    <Section>
      <SectionHead title="Shop by brand" href="/brands" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">{brands.slice(0, 12).map((b) => <BrandTile key={b.id} b={b} />)}</div>
    </Section>
  );
}
