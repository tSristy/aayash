import Link from 'next/link';
export default function NotFound() {
  return (
    <div className="wrap section">
      <h1 className="page-title">We couldn’t find that product</h1>
      <p className="empty">It may have been removed. <Link href="/products" className="link">Browse all products</Link></p>
    </div>
  );
}
