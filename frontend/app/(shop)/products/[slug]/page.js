import Link from 'next/link';
import { notFound } from 'next/navigation';
import Gallery from '@/components/Gallery';
import GiftBox from '@/components/GiftBox';
import HeartButton from '@/components/HeartButton';
import ProductBuy from '@/components/ProductBuy';
import ProductTabs from '@/components/ProductTabs';
import ProductCard from '@/components/ProductCard';
import ProductView from '@/components/ProductView';
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
  const def = p.variants?.find((v) => v.is_default) || p.variants?.[0];
  const crumb = 'hover:text-ink hover:underline';

  return (
    <>
      <ProductView slug={p.slug} id={p.variants?.[0]?.id ?? p.id} name={p.name} price={Number(p.variants?.[0]?.price ?? p.price) || undefined} />
      <Container className="pt-5 sm:pt-7">
        <nav className="flex flex-wrap items-center gap-1.5 text-xs text-muted" aria-label="Breadcrumb">
          <Link className={crumb} href="/">Home</Link> /
          <Link className={crumb} href="/products">Products</Link> /
          <Link className={crumb} href={`/products?category=${p.category_slug}`}>{p.category_name}</Link> /
          <span className="text-ink">{p.name}</span>
        </nav>

        <div className="mt-5 grid items-start gap-8 md:grid-cols-2 md:gap-12">
          <Gallery product={p} />
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {p.brand_name ? <><Link href={`/products?brand=${p.brand_slug || ''}`} className="hover:underline">{p.brand_name}</Link> · </> : ''}
              <Link href={`/products?category=${p.category_slug}`} className="hover:underline">{p.category_name}</Link>
            </p>
            <div className="mt-2 flex items-start justify-between gap-3">
              <h1 className="text-2xl font-bold leading-tight text-brown sm:text-4xl">{p.name}</h1>
              <HeartButton className="mt-1 !h-10 !w-10 shrink-0" size={20} product={{ id: p.id, slug: p.slug, name: p.name, image_url: p.image_url, price: def?.price, compare_at_price: def?.compare_at_price, variant_label: def?.label, variant_id: def?.id, stock: def?.stock }} />
            </div>
            {(p.short_desc || p.rating) && (
              <p className="mt-3 border-b border-line pb-5 text-sm leading-relaxed text-muted sm:text-base">
                {p.short_desc}
                {p.rating ? <span className="mt-2 block text-xs font-medium text-ink"><span className="text-accent">★</span> {p.rating} ({p.review_count} reviews)</span> : null}
              </p>
            )}
            <div className="mt-5"><ProductBuy product={p} /></div>
            <GiftBox product={p} />
          </div>
        </div>
      </Container>

      <Container className="mt-10">
        <div className="rounded-xl border border-line bg-white p-5 sm:p-8"><ProductTabs product={p} /></div>
      </Container>

      {p.related?.length > 0 && (
        <Section>
          <SectionHead title={p.related_scope === 'store' ? 'You may also like' : `More from ${p.category_name} & related categories`} href={`/products?category=${p.category_slug}`} />
          <ProductGrid>{p.related.map((r) => <ProductCard key={r.id} p={r} />)}</ProductGrid>
        </Section>
      )}
    </>
  );
}
