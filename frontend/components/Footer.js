import Link from 'next/link';
import Container from './ui/Container';

const linkCls = 'mb-1.5 block text-sand hover:text-white';

export default function Footer() {
  return (
    <footer className="mt-20 bg-ink pb-6 pt-12 text-white">
      <Container className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
        <div>
          <p className="mb-1.5 font-display text-2xl font-extrabold">Aayash E-Mart</p>
          <p className="text-sand">Everything you need, all in one place.</p>
        </div>
        <div>
          <h4 className="mb-2.5 text-base">Shop</h4>
          <Link className={linkCls} href="/products">All products</Link>
          <Link className={linkCls} href="/products?deal=1">Deals</Link>
          <Link className={linkCls} href="/cart">Your cart</Link>
        </div>
        <div>
          <h4 className="mb-2.5 text-base">Help</h4>
          <Link className={linkCls} href="/#delivery">Delivery</Link>
          <Link className={linkCls} href="/#delivery">Refunds</Link>
        </div>
        <div>
          <h4 className="mb-2.5 text-base">Contact</h4>
          <p className="mb-1.5 text-sand">Dhaka, Bangladesh</p>
          <p className="mb-1.5 text-sand">hello@aayashemart.com</p>
        </div>
      </Container>
      <Container className="mt-8 border-t border-white/15 pt-4 text-sm text-sand">© {new Date().getFullYear()} Aayash E-Mart</Container>
    </footer>
  );
}
