import { notFound } from 'next/navigation';
import Container from '@/components/ui/Container';
import { safe } from '@/lib/api';

export async function generateMetadata({ params }) {
  const p = await safe(`/api/pages/${params.slug}`, null);
  return p ? { title: p.title, description: p.meta_description || undefined } : { title: 'Page not found' };
}

// Admin-written page body. Plain text becomes paragraphs; trusted HTML (admin only) is kept.
const looksHtml = (s) => /<\/?[a-z][\s\S]*>/i.test(s);
export default async function CmsPage({ params }) {
  const page = await safe(`/api/pages/${params.slug}`, null);
  if (!page) notFound();
  return (
    <Container className="py-12">
      <article className="mx-auto max-w-3xl">
        <h1 className="mb-6 font-bold text-4xl text-brown">{page.title}</h1>
        {looksHtml(page.body || '')
          ? <div className="cms leading-relaxed text-ink/80" dangerouslySetInnerHTML={{ __html: page.body }} />
          : <div className="space-y-4 leading-relaxed text-ink/80">{String(page.body || '').split(/\n{2,}/).map((para, i) => <p key={i} className="whitespace-pre-line">{para}</p>)}</div>}
      </article>
    </Container>
  );
}
