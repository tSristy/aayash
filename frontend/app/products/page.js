import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import Pill from '@/components/ui/Pill';
import ProductGrid from '@/components/ui/ProductGrid';
import { Section, PageTitle } from '@/components/ui/Section';
import { safe } from '@/lib/api';

const SORTS = [['popular', 'Popular'], ['price_asc', 'Price: low to high'], ['price_desc', 'Price: high to low'], ['newest', 'Newest']];

export const metadata = { title: 'Shop all – Aayash E-Mart' };

export default async function Products({ searchParams }) {
  const { category = '', q = '', sort = 'popular', deal = '' } = searchParams;
  const qs = (o) => {
    const p = new URLSearchParams();
    Object.entries({ category, q, sort, deal, ...o }).forEach(([k, v]) => v && p.set(k, v));
    const s = p.toString();
    return '/products' + (s ? `?${s}` : '');
  };
  const params = new URLSearchParams({ sort, ...(category && { category }), ...(q && { q }), ...(deal && { deal }) });
  const [categories, products] = await Promise.all([safe('/api/categories', []), safe(`/api/products?${params}`, [])]);
  const active = categories.find((c) => c.slug === category);
  const title = q ? `Results for “${q}”` : deal ? 'Deals' : active ? active.name : 'All products';

  return (
    <Section className="pt-5">
      <nav className="text-sm text-muted" aria-label="Breadcrumb"><Link href="/" className="hover:text-primary-deep">Home</Link> / <span>Products</span></nav>
      <PageTitle>{title}</PageTitle>

      <div className="mb-7 grid gap-3">
        <div className="flex flex-wrap gap-2">
          <Pill href={qs({ category: '' })} active={!category}>All</Pill>
          {categories.map((c) => <Pill key={c.id} href={qs({ category: c.slug })} active={category === c.slug}>{c.emoji} {c.name}</Pill>)}
        </div>
        <div className="flex flex-wrap gap-2">
          {SORTS.map(([k, label]) => <Pill key={k} href={qs({ sort: k })} active={sort === k} quiet>{label}</Pill>)}
        </div>
      </div>

      {products.length === 0
        ? <p className="text-muted">No products found. Try another category or search term.</p>
        : <ProductGrid>{products.map((p) => <ProductCard key={p.id} p={p} />)}</ProductGrid>}
    </Section>
  );
}
