import Link from 'next/link';
import { notFound } from 'next/navigation';
import Gallery from '@/components/Gallery';
import ProductBuy from '@/components/ProductBuy';
import ProductTabs from '@/components/ProductTabs';
import ProductCard from '@/components/ProductCard';
import Container from '@/components/ui/Container';
import ProductGrid from '@/components/ui/ProductGrid';
import { Section, SectionHead } from '@/components/ui/Section';
import { safe } from '@/lib/api';

export async function generateMetadata({ params }) {
  const p = await safe(`/api/products/${params.slug}`, null);
  return { title: p ? `${p.name} – Aayash E-Mart` : 'Product not found' };
}

export default async function ProductPage({ params }) {
  const p = await safe(`/api/products/${params.slug}`, null);
  if (!p) notFound();
  const crumb = 'hover:text-primary-deep';

  return (
    <>
      <div className="bg-tint pb-12">
        <Container>
          <nav className="pt-5 text-sm text-muted" aria-label="Breadcrumb">
            <Link className={crumb} href="/">Home</Link> / <Link className={crumb} href="/products">Products</Link> / <Link className={crumb} href={`/products?category=${p.category_slug}`}>{p.category_name}</Link> / <span>{p.name}</span>
          </nav>
          <div className="mt-5 grid items-start gap-10 md:grid-cols-2 md:gap-14">
            <Gallery product={p} />
            <div>
              <p className="text-sm font-bold text-primary-deep">{p.brand_name ? `${p.brand_name} · ` : ''}<Link href={`/products?category=${p.category_slug}`}>{p.category_name}</Link></p>
              <h1 className="mb-1 mt-1.5 text-[34px] md:text-[44px]">{p.name}</h1>
              <p className="mb-5 text-muted">{p.short_desc}{p.rating ? ` · ★ ${p.rating} (${p.review_count} reviews)` : ''}</p>
              <ProductBuy product={p} />
            </div>
          </div>
        </Container>
      </div>

      <Container><ProductTabs product={p} /></Container>

      {p.related.length > 0 && (
        <Section>
          <SectionHead title="You may also like" href={`/products?category=${p.category_slug}`} />
          <ProductGrid>{p.related.map((r) => <ProductCard key={r.id} p={r} />)}</ProductGrid>
        </Section>
      )}
    </>
  );
}
