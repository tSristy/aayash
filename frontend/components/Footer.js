import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="wrap footer-grid">
        <div>
          <p className="footer-brand">Aayash E-Mart</p>
          <p className="footer-muted">Everything you need, all in one place.</p>
        </div>
        <div>
          <h4>Shop</h4>
          <Link href="/products">All products</Link>
          <Link href="/products?deal=1">Deals</Link>
          <Link href="/cart">Your cart</Link>
        </div>
        <div>
          <h4>Help</h4>
          <Link href="/#delivery">Delivery</Link>
          <Link href="/#delivery">Refunds</Link>
        </div>
        <div>
          <h4>Contact</h4>
          <p className="footer-muted">Dhaka, Bangladesh</p>
          <p className="footer-muted">hello@aayashemart.com</p>
        </div>
      </div>
      <div className="wrap footer-bottom">© {new Date().getFullYear()} Aayash E-Mart</div>
    </footer>
  );
}
