import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import SortSelect from '@/components/SortSelect';
import ProductGrid from '@/components/ui/ProductGrid';
import { Section, PageTitle } from '@/components/ui/Section';
import { safe } from '@/lib/api';

const SORTS = [['popular', 'Popular'], ['price_asc', 'Price: low to high'], ['price_desc', 'Price: high to low'], ['newest', 'Newest']];

export const metadata = { title: 'Shop all – Aayash E-Mart' };

const linkCls = (on) => `block rounded-md px-2.5 py-1.5 text-sm ${on ? 'bg-tint font-semibold text-brown' : 'text-ink hover:bg-tint'}`;

export default async function Products({ searchParams }) {
  const { category = '', q = '', sort = 'popular', deal = '', brand = '' } = searchParams;
  const qs = (o) => {
    const p = new URLSearchParams();
    Object.entries({ category, q, sort, deal, brand, ...o }).forEach(([k, v]) => v && p.set(k, v));
    const s = p.toString();
    return '/products' + (s ? `?${s}` : '');
  };
  const params = new URLSearchParams({ sort, ...(category && { category }), ...(q && { q }), ...(deal && { deal }), ...(brand && { brand }) });
  const [categories, brands, products] = await Promise.all([safe('/api/categories', []), safe('/api/brands', []), safe(`/api/products?${params}`, [])]);
  const active = categories.find((c) => c.slug === category);
  const activeBrand = brands.find((b) => b.slug === brand);
  const title = q ? `Results for “${q}”` : deal ? 'Deals' : activeBrand && !active ? activeBrand.name : active ? active.name : 'All products';
  const hrefs = Object.fromEntries(SORTS.map(([k]) => [k, qs({ sort: k })]));
  const parentIds = new Set(categories.map((c) => Number(c.parent_id)).filter(Boolean));
  const topCats = categories.filter((c) => Number(c.product_count) > 0 && (!parentIds.has(Number(c.id)) || Number(c.own_product_count) > 0));
  const filtered = category || brand || q || deal;

  return (
    <Section className="pt-5 sm:pt-7">
      <nav className="mb-2 text-xs text-muted" aria-label="Breadcrumb"><Link href="/" className="hover:text-ink">Home</Link> / <span className="text-ink">Products</span>{active ? <> / <span className="text-ink">{active.name}</span></> : null}</nav>
      <PageTitle>{title}</PageTitle>

      <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="grid content-start gap-5 text-sm">
          <div className="hidden lg:block">
            <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Category</p>
            <Link href={qs({ category: '' })} className={linkCls(!category)}>All</Link>
            {topCats.map((c) => <Link key={c.id} href={qs({ category: c.slug })} className={linkCls(category === c.slug)}>{c.name}</Link>)}
          </div>
          {brands.length > 0 && (
            <div className="hidden lg:block">
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Brand</p>
              <Link href={qs({ brand: '' })} className={linkCls(!brand)}>All brands</Link>
              {brands.map((b) => <Link key={b.id} href={qs({ brand: b.slug })} className={linkCls(brand === b.slug)}>{b.name} <span className="text-muted">({b.product_count})</span></Link>)}
            </div>
          )}
          {/* Phones: compact chips instead of a sidebar */}
          <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 lg:hidden [scrollbar-width:none]">
            <Link href={qs({ category: '' })} className={`whitespace-nowrap rounded-full border px-3 py-1.5 ${!category ? 'border-brown bg-brown text-white' : 'border-line'}`}>All</Link>
            {topCats.map((c) => <Link key={c.id} href={qs({ category: c.slug })} className={`whitespace-nowrap rounded-full border px-3 py-1.5 ${category === c.slug ? 'border-brown bg-brown text-white' : 'border-line'}`}>{c.name}</Link>)}
          </div>
          {brands.length > 0 && (
            <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 lg:hidden [scrollbar-width:none]">
              {brands.map((b) => <Link key={b.id} href={qs({ brand: brand === b.slug ? '' : b.slug })} className={`whitespace-nowrap rounded-full border px-3 py-1.5 ${brand === b.slug ? 'border-brown bg-brown text-white' : 'border-line'}`}>{b.name}</Link>)}
            </div>
          )}
        </aside>

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted">{products.length} {products.length === 1 ? 'product' : 'products'}{filtered ? <> · <Link href="/products" className="underline hover:text-ink">Clear filters</Link></> : null}</p>
            <SortSelect value={sort} options={SORTS} hrefs={hrefs} />
          </div>
          {products.length === 0 ? (
            <div className="rounded-xl border border-line p-10 text-center">
              <p className="font-semibold text-brown">No products found.</p>
              <p className="mt-1 text-sm text-muted">Try another category, brand or search term.</p>
            </div>
          ) : <ProductGrid>{products.map((p) => <ProductCard key={p.id} p={p} />)}</ProductGrid>}
        </div>
      </div>
    </Section>
  );
}
