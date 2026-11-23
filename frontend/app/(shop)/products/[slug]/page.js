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
  const crumb = 'transition-colors hover:text-[#A65A3E]';

  return (
    <>
      <div className="border-b border-[#E2D9CE] bg-[#F5F1EB] pb-14 pt-6">
        <Container>
          <nav
            className="flex flex-wrap items-center gap-2 text-[11px] font-medium uppercase tracking-[0.2em] text-stone-500"
            aria-label="Breadcrumb"
          >
            <Link className={crumb} href="/">
              Home
            </Link>
            <span>/</span>
            <Link className={crumb} href="/products">
              Products
            </Link>
            <span>/</span>
            <Link className={crumb} href={`/products?category=${p.category_slug}`}>
              {p.category_name}
            </Link>
            <span>/</span>
            <span className="text-[#2E261F]">{p.name}</span>
          </nav>

          <div className="mt-8 grid items-start gap-10 md:grid-cols-2 md:gap-14">
            <div className="border border-[#E2D9CE] bg-white p-4 sm:p-6">
              <Gallery product={p} />
            </div>

            <div className="border border-[#E2D9CE] bg-white p-6 sm:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-[#A65A3E]">
                {p.brand_name ? `${p.brand_name} · ` : ''}
                <Link href={`/products?category=${p.category_slug}`} className="hover:underline">
                  {p.category_name}
                </Link>
              </p>

              <h1 className="mb-3 mt-2.5 font-serif text-[34px] font-normal leading-[1.1] tracking-tight text-[#2E261F] md:text-[44px]">
                {p.name}
              </h1>

              <p className="mb-6 border-b border-[#E2D9CE] pb-5 text-sm leading-relaxed text-stone-600 sm:text-base">
                {p.short_desc}
                {p.rating ? (
                  <span className="mt-2 block text-xs font-medium uppercase tracking-wider text-[#2E261F]">
                    <span className="text-[#A65A3E]">★</span> {p.rating} ({p.review_count} reviews)
                  </span>
                ) : null}
              </p>

              <ProductBuy product={p} />
            </div>
          </div>
        </Container>
      </div>

      <Container className="py-10">
        <div className="border border-[#E2D9CE] bg-white p-6 sm:p-8">
          <ProductTabs product={p} />
        </div>
      </Container>

      {p.related?.length > 0 && (
        <Section className="border-t border-[#E2D9CE]">
          <SectionHead title={p.related_scope === 'store' ? 'You may also like' : `More from ${p.category_name} & related categories`} href={`/products?category=${p.category_slug}`} />
          <ProductGrid>
            {p.related.map((r) => (
              <ProductCard key={r.id} p={r} />
            ))}
          </ProductGrid>
        </Section>
      )}
    </>
  );
}