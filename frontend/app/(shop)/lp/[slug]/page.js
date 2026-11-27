import { notFound } from 'next/navigation';
import Container from '@/components/ui/Container';
import LandingOrder from '@/components/LandingOrder';
import { safe } from '@/lib/api';

export async function generateMetadata({ params }) {
  const p = await safe(`/api/landing/${params.slug}`, null);
  return { title: p?.title || 'Offer', robots: { index: false } };
}

export default async function Landing({ params }) {
  const page = await safe(`/api/landing/${params.slug}`, null);
  if (!page) notFound();
  return (
    <div>
      <section className="bg-footer text-white">
        <Container className="grid items-center gap-8 py-12 md:grid-cols-2">
          <div>
            <h1 className="mb-3 font-serif text-4xl font-normal leading-tight sm:text-5xl">{page.headline || page.title}</h1>
            {page.subheadline && <p className="mb-6 text-lg text-stone-200">{page.subheadline}</p>}
            <a href="#order" className="inline-block bg-primary px-8 py-3.5 text-xs font-semibold uppercase tracking-widest text-ink hover:bg-primary-hover">{page.button_text || 'Order now'}</a>
          </div>
          {page.hero_image && <img src={page.hero_image} alt="" className="max-h-[360px] w-full object-cover" />}
        </Container>
      </section>
      {page.body && <Container className="py-10"><div className="mx-auto max-w-3xl space-y-4 leading-relaxed text-stone-700">{String(page.body).split(/\n{2,}/).map((para, i) => <p key={i} className="whitespace-pre-line">{para}</p>)}</div></Container>}
      <Container className="pb-16"><div id="order" className="mx-auto max-w-2xl scroll-mt-24"><LandingOrder page={page} /></div></Container>
    </div>
  );
}
