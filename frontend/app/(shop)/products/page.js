import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import Pill from '@/components/ui/Pill';
import ProductGrid from '@/components/ui/ProductGrid';
import { Section, PageTitle } from '@/components/ui/Section';
import { safe } from '@/lib/api';

const SORTS = [['popular', 'Popular'], ['price_asc', 'Price: low to high'], ['price_desc', 'Price: high to low'], ['newest', 'Newest']];

const catPill = (on) => `!rounded-none !border !text-xs ${on ? '!border-[#2E261F] !bg-[#2E261F] !text-white' : '!border-[#E2D9CE] !bg-white !text-[#2E261F] hover:!border-[#A65A3E]'}`;
const sortPill = (on) => `!rounded-none !border !text-xs ${on ? '!border-[#A65A3E] !bg-[#A65A3E] !text-white' : '!border-[#E2D9CE] !bg-white !text-stone-700 hover:!border-[#A65A3E]'}`;

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
    <Section className="pt-8">
      <nav className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-widest text-stone-500" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-[#A65A3E]">Home</Link> / <span className="text-[#2E261F]">Products</span>
      </nav>
      <PageTitle className="!font-serif !font-normal !text-[#2E261F]">{title}</PageTitle>

      <div className="mb-8 mt-6 grid gap-4 border border-[#E2D9CE] bg-[#F5F1EB] p-5 sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 text-xs font-semibold uppercase tracking-widest text-stone-500">Category:</span>
          <Pill href={qs({ category: '' })} active={!category} className={catPill(!category)}>All</Pill>
          {categories.map((c) => (
            <Pill key={c.id} href={qs({ category: c.slug })} active={category === c.slug} className={catPill(category === c.slug)}>
              {c.name}
            </Pill>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-[#E2D9CE] pt-4">
          <span className="mr-2 text-xs font-semibold uppercase tracking-widest text-stone-500">Sort by:</span>
          {SORTS.map(([k, label]) => (
            <Pill key={k} href={qs({ sort: k })} active={sort === k} quiet className={sortPill(sort === k)}>{label}</Pill>
          ))}
        </div>
      </div>

      {products.length === 0 ? (
        <div className="border border-[#E2D9CE] bg-[#F5F1EB] p-10 text-center">
          <p className="font-serif text-lg text-[#2E261F]">No products found.</p>
          <p className="mt-1 text-sm text-stone-500">Try another category or search term.</p>
        </div>
      ) : (
        <ProductGrid>{products.map((p) => <ProductCard key={p.id} p={p} />)}</ProductGrid>
      )}
    </Section>
  );
}