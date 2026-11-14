import Link from 'next/link';
import { Section, PageTitle } from '@/components/ui/Section';

export default function NotFound() {
  return (
    <Section>
      <PageTitle>We couldn’t find that product</PageTitle>
      <p className="text-muted">It may have been removed. <Link href="/products" className="font-bold text-primary-deep">Browse all products</Link></p>
    </Section>
  );
}
