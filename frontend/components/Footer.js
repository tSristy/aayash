import Link from 'next/link';
import Container from './ui/Container';

const headingCls = 'mb-3 text-xs font-semibold uppercase tracking-widest text-[#E09F87]';
const linkCls = 'mb-2 block text-sm text-stone-300 transition-colors hover:text-white';

export default function Footer() {
  return (
    <footer className="mt-20 border-t border-[#E2D9CE] bg-[#5D3D29] pb-6 pt-14 text-white">
      <Container className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
        <div>
          <p className="mb-2 font-serif text-2xl font-normal text-white">Aayash E-Mart</p>
          <p className="max-w-[30ch] text-sm leading-relaxed text-stone-300">Everything you need, all in one place.</p>
        </div>
        <div>
          <h4 className={headingCls}>Shop</h4>
          <Link className={linkCls} href="/products">All products</Link>
          <Link className={linkCls} href="/products?deal=1">Deals</Link>
          <Link className={linkCls} href="/cart">Your cart</Link>
          <Link className={linkCls} href="/orders/tracking">Order tracking</Link>
        </div>
        <div>
          <h4 className={headingCls}>Help</h4>
          <Link className={linkCls} href="/orders/tracking">Track your order</Link>
          <Link className={linkCls} href="/#delivery">Delivery</Link>
          <Link className={linkCls} href="/#delivery">Refunds</Link>
        </div>
        <div>
          <h4 className={headingCls}>Contact</h4>
          <p className="mb-2 text-sm text-stone-300">Dhaka, Bangladesh</p>
          <p className="mb-2 text-sm text-stone-300">hello@aayashemart.com</p>
        </div>
      </Container>
      <Container className="mt-10 border-t border-white/15 pt-5 text-xs tracking-wider text-stone-400">
        © {new Date().getFullYear()} Aayash E-Mart
      </Container>
    </footer>
  );
}