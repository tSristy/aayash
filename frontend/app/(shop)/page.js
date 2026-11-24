import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import Countdown from '@/components/Countdown';
import Newsletter from '@/components/Newsletter';
import Container from '@/components/ui/Container';
import Button from '@/components/ui/Button';
import ProductGrid from '@/components/ui/ProductGrid';
import { Section, SectionHead } from '@/components/ui/Section';
import { safe } from '@/lib/api';
import { money } from '@/lib/format';
import Carousel from '@/components/Carousel';
import CatalogImage from '@/components/CatalogImage';

const WHY = [
  ['Picked fresh daily', 'Produce arrives each morning and is packed to order.'],
  ['Cold chain for meat and fish', 'Kept chilled from supplier to your door.'],
  ['Pay when it arrives', 'Cash on delivery is available on every order.'],
  ['Order support', 'Contact our team if there is a problem with your order.'],
];

const primaryBtn = '!rounded-none !border-0 !bg-[#A65A3E] !px-8 !py-3.5 !text-xs !font-semibold !uppercase !tracking-widest !text-white hover:!bg-[#8F4B32]';

export default async function Home() {
  const [categories, best] = await Promise.all([
    safe('/api/categories', []),
    safe('/api/products?sort=popular&limit=8', []),
  ]);

  // The storefront uses the database category tree, never a fixed set of
  // category names. Don't render blank carousels for empty categories.
  const availableCategories = categories.filter((cat) => Number(cat.product_count) > 0);
  const parentIds = new Set(availableCategories.map((cat) => Number(cat.parent_id)).filter(Boolean));
  const carouselCategories = availableCategories.filter((cat) => (
    !parentIds.has(Number(cat.id)) || Number(cat.own_product_count) > 0
  ));

  const allSections = await Promise.all(
    carouselCategories.map(async (cat) => ({
      cat,
      items: await safe(`/api/products?category=${encodeURIComponent(cat.slug)}&limit=12`, []),
    }))
  );
  const catSections = allSections.filter((section) => section.items.length > 0);
  const picks = best.slice(0, 3);

  return (
    <main className="overflow-hidden bg-canvas">
      <Container className="mt-8">
        <div className="relative grid items-center gap-12 overflow-hidden bg-[#3D342B] px-7 py-12 text-white sm:px-12 sm:py-16 lg:grid-cols-[1.15fr_.85fr]">
          <img
            src="https://static.vecteezy.com/system/resources/thumbnails/073/307/092/small_2x/stacked-wooden-boxes-with-shopping-cart-icons-are-placed-on-a-rustic-wooden-table-with-a-blurred-laptop-screen-displaying-an-online-shopping-interface-in-the-background-photo.jpeg"
            alt=""
            referrerPolicy="no-referrer"
            className="pointer-events-none absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/80 via-white/10 to-black/25" aria-hidden />

          <div className="relative z-10">
            <h1 className="mb-5 max-w-[14ch] font-serif text-[clamp(38px,5vw,50px)] font-normal leading-[1.15] text-white">
              <span className="bg-[#A65A3E] px-2.5 py-0.5 box-decoration-clone">Fresh groceries,</span> ordered with ease.
            </h1>
            <p className="max-w-[46ch] text-base leading-relaxed text-stone-200 sm:text-lg">
              Explore food and pantry essentials. Delivery availability and timing are confirmed after ordering.
            </p>

            <div className="my-8 flex flex-wrap gap-3.5">
              <Button href="/products" size="lg" className={primaryBtn}>Shop groceries</Button>
              <Button href="/products?deal=1" size="lg" variant="outline"
                className="!rounded-none !border-white/40 !bg-transparent !px-7 !py-3.5 !text-xs !font-semibold !uppercase !tracking-widest !text-white hover:!border-white hover:!bg-white/10">
                See today’s deals
              </Button>
            </div>

            <ul className="flex flex-wrap gap-5 text-xs font-medium text-stone-200">
              {['Dhaka delivery ৳70 · Outside ৳120', 'Order support available', 'Pay on delivery'].map((t) => (
                <li key={t}><span className="text-[#E09F87]">✓ </span>{t}</li>
              ))}
            </ul>
          </div>

          <div className="relative z-10 grid gap-3.5 border border-white/15 bg-[#2E261F]/75 p-6 backdrop-blur-sm">
            <p className="text-xs font-medium uppercase tracking-widest text-stone-300">Picked for you today</p>
            {picks.length === 0 && <p className="text-sm text-stone-300">Start the backend (port 4000) to see products here.</p>}
            {picks.map((p, i) => (
              <Link key={p.id} href={`/products/${p.slug}`}
                className={`flex items-center gap-3.5 border border-white/15 bg-[#F5F1EB] px-4 py-3.5 text-[#2E261F] transition-transform hover:translate-x-1 ${i === 1 ? 'sm:ml-6' : ''}`}>
                <CatalogImage
                  src={p.image_url}
                  alt={p.name}
                  className="h-14 w-14 shrink-0"
                  imageClassName="object-cover"
                  fallbackText="No photo"
                />
                <span className="flex-1 font-serif text-base font-medium">
                  {p.name}
                  <small className="block font-sans text-xs font-normal text-stone-500">{p.variant_label}</small>
                </span>
                <span className="text-sm font-semibold text-[#A65A3E]">{money(p.price)}</span>
              </Link>
            ))}
          </div>
        </div>
      </Container>

      <Section>
        <SectionHead title="Shop by category" href="/products" />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4">
          {availableCategories.map((c) => (
            <Link key={c.id} href={`/products?category=${c.slug}`}
              className="group overflow-hidden border border-[#E2D9CE] bg-[#F5F1EB] transition-all hover:border-[#A65A3E] hover:bg-white hover:shadow-sm">
              <div className="aspect-[4/3] overflow-hidden bg-[#E8E0D5]">
                <CatalogImage
                  src={c.image_url}
                  alt={`${c.name} category`}
                  className="h-full w-full transition-transform duration-300 group-hover:scale-105"
                  imageClassName="object-cover"
                />
              </div>
              <div className="grid justify-items-center gap-1.5 px-3 py-4 text-center">
                <strong className="font-serif text-base font-medium text-[#2E261F]">{c.name}</strong>
                <small className="text-[11px] uppercase tracking-wider text-stone-500">
                  {c.product_count} {Number(c.product_count) === 1 ? 'item' : 'items'}
                </small>
              </div>
            </Link>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHead title="Best sellers" href="/products?sort=popular" />
        <ProductGrid>{best.map((p) => <ProductCard key={p.id} p={p} />)}</ProductGrid>
      </Section>

      <Section>
        <div className="flex flex-wrap items-center justify-between gap-7 border border-[#2E261F]/15 bg-[#5D3D29] px-7 py-9 text-white sm:px-12">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-[#E09F87]">Limited Time • Ends Tonight</p>
            <h2 className="mb-1.5 font-serif text-[28px] font-normal sm:text-[34px]">Today’s deals end at midnight</h2>
            <p className="text-sm text-stone-300">Lower prices on fruit, fish, dairy and pantry items, until tonight.</p>
          </div>
          <Countdown />
          <Button href="/products?deal=1" size="lg" className={primaryBtn}>Shop the deals</Button>
        </div>
      </Section>



      {catSections.length > 0 && (
        <Section>
          <Carousel sections={catSections} />
        </Section>
      )}

      <Section id="delivery">
        <div className="grid gap-6 border-y border-[#E2D9CE] py-10 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map(([title, text], i) => (
            <div key={title} className="border-l-2 border-[#A65A3E] pl-4">
              <span className="mb-1 block text-xs font-semibold tracking-widest text-[#A65A3E]">0{i + 1}</span>
              <h3 className="mb-1.5 font-serif text-xl font-normal text-[#2E261F]">{title}</h3>
              <p className="text-sm text-stone-600">{text}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section>
        <div className="grid items-center gap-8 border border-[#E2D9CE] bg-[#F5F1EB] p-8 sm:p-12 md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium uppercase tracking-widest text-[#A65A3E]">Weekly Harvest List</p>
            <h2 className="mb-2 font-serif text-[28px] font-normal text-[#2E261F] sm:text-[32px]">Get offers in your inbox</h2>
            <p className="text-sm text-stone-600">One email a week with the best prices. Unsubscribe any time.</p>
          </div>
          <Newsletter />
        </div>
      </Section>
    </main>
  );
}