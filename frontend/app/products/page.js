import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
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
    <div className="wrap section">
      <nav className="crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link> / <span>Products</span></nav>
      <h1 className="page-title">{title}</h1>

      <div className="filters">
        <div className="pills">
          <Link href={qs({ category: '' })} className={`pill${!category ? ' on' : ''}`}>All</Link>
          {categories.map((c) => (
            <Link key={c.id} href={qs({ category: c.slug })} className={`pill${category === c.slug ? ' on' : ''}`}>{c.emoji} {c.name}</Link>
          ))}
        </div>
        <div className="pills sorts">
          {SORTS.map(([k, label]) => <Link key={k} href={qs({ sort: k })} className={`pill pill-quiet${sort === k ? ' on' : ''}`}>{label}</Link>)}
        </div>
      </div>

      {products.length === 0
        ? <p className="empty">No products found. Try another category or search term.</p>
        : <div className="grid">{products.map((p) => <ProductCard key={p.id} p={p} />)}</div>}
    </div>
  );
}
