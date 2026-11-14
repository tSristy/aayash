import Link from 'next/link';
import { notFound } from 'next/navigation';
import Gallery from '@/components/Gallery';
import ProductBuy from '@/components/ProductBuy';
import ProductTabs from '@/components/ProductTabs';
import ProductCard from '@/components/ProductCard';
import { safe } from '@/lib/api';

export async function generateMetadata({ params }) {
  const p = await safe(`/api/products/${params.slug}`, null);
  return { title: p ? `${p.name} – Aayash E-Mart` : 'Product not found' };
}

export default async function ProductPage({ params }) {
  const p = await safe(`/api/products/${params.slug}`, null);
  if (!p) notFound();

  return (
    <>
      <div className="pdp-top">
        <div className="wrap">
          <nav className="crumbs" aria-label="Breadcrumb">
            <Link href="/">Home</Link> / <Link href="/products">Products</Link> / <Link href={`/products?category=${p.category_slug}`}>{p.category_name}</Link> / <span>{p.name}</span>
          </nav>
          <div className="pdp">
            <Gallery product={p} />
            <div>
              <p className="pdp-brand">{p.brand_name ? `${p.brand_name} · ` : ''}<Link href={`/products?category=${p.category_slug}`}>{p.category_name}</Link></p>
              <h1>{p.name}</h1>
              <p className="pdp-sub">{p.short_desc}{p.rating ? ` · ★ ${p.rating} (${p.review_count} reviews)` : ''}</p>
              <ProductBuy product={p} />
            </div>
          </div>
        </div>
      </div>

      <div className="wrap"><ProductTabs product={p} /></div>

      {p.related.length > 0 && (
        <section className="wrap section">
          <div className="section-head"><h2>You may also like</h2><Link href={`/products?category=${p.category_slug}`}>View all</Link></div>
          <div className="grid">{p.related.map((r) => <ProductCard key={r.id} p={r} />)}</div>
        </section>
      )}
    </>
  );
}
