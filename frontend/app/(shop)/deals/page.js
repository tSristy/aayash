import Link from 'next/link';
import DealCard from '@/components/DealCard';
import { Section, PageTitle } from '@/components/ui/Section';
import { safe } from '@/lib/api';

export const metadata = { title: 'Hot Deals – Aayash E-Mart' };

export default async function Deals() {
  const deals = await safe('/api/products?combo=1&limit=60&sort=newest', []);
  return (
    <Section className="pt-6 sm:pt-8">
      <div className="flex items-center gap-3"><PageTitle className="!mb-0">Hot deals</PageTitle><span className="rounded-md bg-accent px-2 py-0.5 text-xs font-bold uppercase text-ink">Hot</span></div>
      <p className="mb-6 mt-2 text-sm text-muted">Combo packs with free gifts. Buy the pack and the extras are on us.</p>
      {deals.length === 0 ? (
        <div className="rounded-xl border border-line p-10 text-center">
          <p className="font-semibold text-brown">No deals right now.</p>
          <p className="mt-1 text-sm text-muted">Check back soon, or <Link href="/products" className="underline">browse all products</Link>.</p>
        </div>
      ) : <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3 xl:grid-cols-4">{deals.map((p) => <DealCard key={p.id} p={p} />)}</div>}
    </Section>
  );
}
