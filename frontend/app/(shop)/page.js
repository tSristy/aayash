import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import DealCard from '@/components/DealCard';
import BrandRow from '@/components/BrandRow';
import CategoryRow from '@/components/CategoryRow';
import TrustStrip from '@/components/TrustStrip';
import Newsletter from '@/components/Newsletter';
import HomeSlider from '@/components/HomeSlider';
import Banners from '@/components/Banners';
import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';
import ProductGrid from '@/components/ui/ProductGrid';
import { Section, SectionHead } from '@/components/ui/Section';
import { safe } from '@/lib/api';
import { getSite } from '@/lib/site';

export default async function Home() {
  const [site, categories, trending, fresh, deals, brands] = await Promise.all([
    getSite(),
    safe('/api/categories', []),
    safe('/api/products?sort=popular&limit=8', []),
    safe('/api/products?sort=newest&limit=8', []),
    safe('/api/products?combo=1&limit=4', []),
    safe('/api/brands', []),
  ]);
  const st = site.settings;
  // Category icons come from the database tree; empty categories are hidden.
  const parentIds = new Set(categories.map((c) => Number(c.parent_id)).filter(Boolean));
  const cats = categories.filter((c) => Number(c.product_count) > 0 && (!parentIds.has(Number(c.id)) || Number(c.own_product_count) > 0)).slice(0, 12);
  const trendingIds = new Set(trending.map((p) => p.id));
  const newArrivals = fresh.filter((p) => !trendingIds.has(p.id)).slice(0, 8);
  const freshRow = newArrivals.length >= 4 ? newArrivals : fresh;

  return (
    <>
      {site.sliders.length > 0 ? <HomeSlider slides={site.sliders} /> : (
        <div className="bg-tint">
          <Container className="py-12 sm:py-20">
            <h1 className="max-w-[18ch] text-3xl font-bold text-brown sm:text-5xl">{st.hero_title || 'Fresh groceries, ordered with ease.'}</h1>
            <p className="mt-3 max-w-[48ch] text-base text-ink/80 sm:text-lg">{st.hero_text || 'Explore food and pantry essentials. Delivery availability and timing are confirmed after ordering.'}</p>
            <div className="mt-6 flex flex-wrap gap-3"><Button href="/products" size="lg">Shop groceries</Button><Button href="/deals" size="lg" variant="outline">See hot deals</Button></div>
          </Container>
        </div>
      )}
      <Banners items={site.banners.home_top} className="mt-6" />

      <CategoryRow categories={cats} />
      <Banners items={site.banners.home_middle} />

      <Section>
        <SectionHead title="Trending now" sub="What other customers are buying" href="/products?sort=popular" />
        {trending.length ? <ProductGrid>{trending.map((p) => <ProductCard key={p.id} p={p} />)}</ProductGrid> : <p className="rounded-xl border border-line p-8 text-center text-sm text-muted">Products will appear here soon.</p>}
      </Section>

      <TrustStrip settings={st} />

      {deals.length > 0 && (
        <Section>
          <SectionHead title="Hot deals" sub="Buy the combo and get free gifts" href="/deals" />
          <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-4">{deals.map((p) => <DealCard key={p.id} p={p} />)}</div>
        </Section>
      )}

      {freshRow.length > 0 && (
        <Section>
          <SectionHead title="Fresh today" sub="New arrivals in the store" href="/products?sort=newest" />
          <ProductGrid>{freshRow.map((p) => <ProductCard key={p.id} p={p} />)}</ProductGrid>
        </Section>
      )}

      <BrandRow brands={brands} />
      <Banners items={site.banners.home_bottom} />

      <Section>
        <div className="grid items-center gap-6 rounded-2xl bg-tint p-6 sm:p-10 md:grid-cols-2">
          <div>
            <h2 className="text-xl font-bold text-brown sm:text-2xl">Get offers in your inbox</h2>
            <p className="mt-1.5 text-sm text-muted">One email a week with the best prices. Unsubscribe any time.</p>
          </div>
          <Newsletter />
        </div>
      </Section>
    </>
  );
}
