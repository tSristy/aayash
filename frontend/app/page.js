import Link from 'next/link';
import ProductCard from '@/components/ProductCard';
import Countdown from '@/components/Countdown';
import Newsletter from '@/components/Newsletter';
import { safe } from '@/lib/api';
import { money } from '@/lib/format';

export default async function Home() {
  const [categories, best] = await Promise.all([
    safe('/api/categories', []),
    safe('/api/products?sort=popular&limit=8', []),
  ]);
  const picks = best.slice(0, 3);

  return (
    <>
      <section className="wrap hero">
        <div className="hero-copy">
          <h1>Fresh groceries, at your door by evening.</h1>
          <p>Vegetables, fish, meat, dairy and pantry staples from trusted suppliers. Order before 4 pm for same-day delivery in Dhaka.</p>
          <div className="hero-cta">
            <Link href="/products" className="btn btn-lg">Shop groceries</Link>
            <Link href="/products?deal=1" className="btn btn-lg btn-outline">See today’s deals</Link>
          </div>
          <ul className="hero-points">
            <li>Free delivery over ৳1,000</li>
            <li>Not fresh? Full refund</li>
            <li>Pay on delivery</li>
          </ul>
        </div>

        <div className="hero-panel">
          <p className="panel-title">Picked for you today</p>
          {picks.length === 0 && <p className="panel-empty">Start the backend (port 4000) to see products here.</p>}
          {picks.map((p, i) => (
            <Link href={`/products/${p.slug}`} className="panel-row" key={p.id} style={{ marginLeft: i === 1 ? 28 : 0 }}>
              <span className="panel-emoji">{p.emoji}</span>
              <span className="panel-name">{p.name}<small>{p.variant_label}</small></span>
              <span className="panel-price">{money(p.price)}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="wrap section">
        <div className="section-head"><h2>Shop by category</h2><Link href="/products">View all</Link></div>
        <div className="cats">
          {categories.map((c) => (
            <Link key={c.id} href={`/products?category=${c.slug}`} className="cat">
              <span className="cat-emoji">{c.emoji}</span>
              <strong>{c.name}</strong>
              <small>{c.product_count} items</small>
            </Link>
          ))}
        </div>
      </section>

      <section className="wrap section">
        <div className="section-head"><h2>Best sellers</h2><Link href="/products?sort=popular">View all</Link></div>
        <div className="grid">{best.map((p) => <ProductCard key={p.id} p={p} />)}</div>
      </section>

      <section className="wrap section">
        <div className="offer">
          <div>
            <h2>Today’s deals end at midnight</h2>
            <p>Lower prices on fruit, fish, dairy and pantry items, until tonight.</p>
          </div>
          <Countdown />
          <Link href="/products?deal=1" className="btn btn-lg">Shop the deals</Link>
        </div>
      </section>

      <section className="wrap section" id="delivery">
        <div className="why">
          <div><h3>Picked fresh daily</h3><p>Produce arrives each morning and is packed to order.</p></div>
          <div><h3>Cold chain for meat and fish</h3><p>Kept chilled from supplier to your door.</p></div>
          <div><h3>Pay when it arrives</h3><p>Cash on delivery is available on every order.</p></div>
          <div><h3>Easy refunds</h3><p>Not happy with an item? Tell us within 24 hours.</p></div>
        </div>
      </section>

      <section className="wrap section">
        <div className="news">
          <div><h2>Get offers in your inbox</h2><p>One email a week with the best prices. Unsubscribe any time.</p></div>
          <Newsletter />
        </div>
      </section>
    </>
  );
}
