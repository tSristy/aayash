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

const WHY = [
  ['Picked fresh daily', 'Produce arrives each morning and is packed to order.'],
  ['Cold chain for meat and fish', 'Kept chilled from supplier to your door.'],
  ['Pay when it arrives', 'Cash on delivery is available on every order.'],
  ['Easy refunds', 'Not happy with an item? Tell us within 24 hours.'],
];

export default async function Home() {
  const [categories, best] = await Promise.all([
    safe('/api/categories', []),
    safe('/api/products?sort=popular&limit=8', []),
  ]);
  const picks = best.slice(0, 3);

  return (
    <>
      <Container className="grid items-center gap-12 pt-12 lg:grid-cols-[1.15fr_.85fr]">
        <div>
          <h1 className="mb-[18px] max-w-[14ch] text-[clamp(38px,5vw,60px)] leading-[1.05] text-brown">Fresh groceries, at your door by evening.</h1>
          <p className="max-w-[46ch] text-lg text-muted">Vegetables, fish, meat, dairy and pantry staples from trusted suppliers. Order before 4 pm for same-day delivery in Dhaka.</p>
          <div className="my-7 flex flex-wrap gap-3">
            <Button href="/products" size="lg">Shop groceries</Button>
            <Button href="/products?deal=1" size="lg" variant="outline">See today’s deals</Button>
          </div>
          <ul className="flex flex-wrap gap-5 text-sm font-medium">
            {['Free delivery over ৳1,000', 'Not fresh? Full refund', 'Pay on delivery'].map((t) => (
              <li key={t}><span className="font-bold text-primary-deep">✓ </span>{t}</li>
            ))}
          </ul>
        </div>

        <div className="relative grid gap-3.5 overflow-hidden rounded-panel bg-brown p-7">
          <div className="absolute -right-[60px] -top-[60px] h-[180px] w-[180px] rounded-full bg-primary" aria-hidden />
          <p className="relative z-10 font-display text-[22px] font-extrabold text-white">Picked for you today</p>
          {picks.length === 0 && <p className="relative z-10 text-peach">Start the backend (port 4000) to see products here.</p>}
          {picks.map((p, i) => (
            <Link key={p.id} href={`/products/${p.slug}`}
              className={`relative z-10 flex items-center gap-3.5 rounded-2xl bg-white px-4 py-3.5 transition-transform hover:translate-x-1 ${i === 1 ? 'ml-7' : ''}`}>
              <span className="grid h-14 w-14 place-items-center rounded-[14px] bg-tint text-[34px]">{p.emoji}</span>
              <span className="flex-1 font-bold">{p.name}<small className="block font-normal text-muted">{p.variant_label}</small></span>
              <span className="font-bold">{money(p.price)}</span>
            </Link>
          ))}
        </div>
      </Container>

      <Section>
        <SectionHead title="Shop by category" href="/products" />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(150px,1fr))] gap-3.5">
          {categories.map((c) => (
            <Link key={c.id} href={`/products?category=${c.slug}`}
              className="grid justify-items-center gap-1 rounded-card border border-line bg-white px-3.5 py-[18px] text-center transition-colors hover:border-primary">
              <span className="mb-1.5 grid h-[68px] w-[68px] place-items-center rounded-full bg-tint text-[38px]">{c.emoji}</span>
              <strong>{c.name}</strong>
              <small className="text-muted">{c.product_count} items</small>
            </Link>
          ))}
        </div>
      </Section>

      <Section>
        <SectionHead title="Best sellers" href="/products?sort=popular" />
        <ProductGrid>{best.map((p) => <ProductCard key={p.id} p={p} />)}</ProductGrid>
      </Section>

      <Section>
        <div className="flex flex-wrap items-center justify-between gap-7 rounded-3xl bg-brown p-6 text-white sm:px-9 sm:py-8">
          <div>
            <h2 className="mb-1.5 text-[30px]">Today’s deals end at midnight</h2>
            <p className="text-peach">Lower prices on fruit, fish, dairy and pantry items, until tonight.</p>
          </div>
          <Countdown />
          <Button href="/products?deal=1" size="lg">Shop the deals</Button>
        </div>
      </Section>

      <Section id="delivery">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {WHY.map(([title, text]) => (
            <div key={title}><h3 className="mb-1.5 text-lg">{title}</h3><p className="text-[15px] text-muted">{text}</p></div>
          ))}
        </div>
      </Section>

      <Section>
        <div className="grid items-center gap-7 rounded-3xl bg-tint p-9 md:grid-cols-2">
          <div><h2 className="mb-1.5 text-[28px]">Get offers in your inbox</h2><p className="text-muted">One email a week with the best prices. Unsubscribe any time.</p></div>
          <Newsletter />
        </div>
      </Section>
    </>
  );
}
