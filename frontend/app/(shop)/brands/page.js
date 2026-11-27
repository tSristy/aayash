import { BrandTile } from '@/components/BrandRow';
import { Section, PageTitle } from '@/components/ui/Section';
import { safe } from '@/lib/api';

export const metadata = { title: 'Brands – Aayash E-Mart' };

export default async function Brands() {
  const brands = await safe('/api/brands', []);
  return (
    <Section className="pt-6 sm:pt-8">
      <PageTitle>Shop by brand</PageTitle>
      {brands.length === 0 ? <p className="rounded-xl border border-line p-10 text-center text-sm text-muted">No brands to show yet.</p> : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4 lg:grid-cols-5">
          {brands.map((b) => (
            <div key={b.id}><BrandTile b={b} /><p className="mt-1.5 text-center text-xs text-muted">{b.name} · {b.product_count} {Number(b.product_count) === 1 ? 'item' : 'items'}</p></div>
          ))}
        </div>
      )}
    </Section>
  );
}
