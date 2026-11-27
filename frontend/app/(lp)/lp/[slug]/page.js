import Link from 'next/link';
import { notFound } from 'next/navigation';
import Container from '@/components/ui/Container';
import LandingOrder from '@/components/LandingOrder';
import StickyOrderBar from '@/components/StickyOrderBar';
import Countdown from '@/components/Countdown';
import CatalogImage from '@/components/CatalogImage';
import { CashIcon, CheckIcon, GiftIcon, HeadsetIcon, TruckIcon } from '@/components/ui/Icons';
import { safe } from '@/lib/api';
import { getSite } from '@/lib/site';
import { money } from '@/lib/format';

export async function generateMetadata({ params }) {
  const p = await safe(`/api/landing/${params.slug}`, null);
  return { title: p?.title || 'Offer', robots: { index: false } };
}

const Stars = ({ n }) => <span aria-label={`${n} out of 5`} className="text-accent">{'★'.repeat(n)}<span className="text-line">{'★'.repeat(5 - n)}</span></span>;

export default async function Landing({ params }) {
  const [page, site] = await Promise.all([safe(`/api/landing/${params.slug}`, null), getSite()]);
  if (!page) notFound();
  const s = site.settings;
  const main = page.products[0];
  const off = main?.compare_at_price ? Math.round((1 - main.price / main.compare_at_price) * 100) : 0;
  const avg = page.reviews.length ? (page.reviews.reduce((t, r) => t + r.rating, 0) / page.reviews.length).toFixed(1) : null;
  const offerGifts = page.products.flatMap((p) => p.gifts || []);
  const htmlBody = page.body && /<\/?[a-z][\s\S]*>/i.test(page.body);
  const cta = page.button_text || 'Order now';

  return (
    <div className="pb-20 md:pb-0">
      <header className="border-b border-line bg-white">
        <Container className="flex items-center justify-between py-2.5">
          <img src={s.logo_url || '/logo.png'} alt={s.site_name || 'Aayash E-Mart'} className="h-9 w-auto sm:h-11" />
          <p className="flex items-center gap-1.5 text-xs font-medium text-brown sm:text-sm"><CashIcon size={18} />Cash on delivery</p>
        </Container>
      </header>

      <section className="bg-tint">
        <Container className="grid items-center gap-6 py-8 sm:py-12 md:grid-cols-2 md:gap-10">
          <div>
            {page.badge && <span className="inline-block rounded-full bg-accent px-3 py-1 text-xs font-bold text-ink">{page.badge}</span>}
            <h1 className="mt-3 text-3xl font-bold leading-[1.15] text-brown sm:text-5xl">{page.headline || page.title}</h1>
            {page.subheadline && <p className="mt-3 text-base text-ink/80 sm:text-lg">{page.subheadline}</p>}
            {main && (
              <p className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-3xl font-bold text-ink sm:text-4xl">{money(main.price)}</span>
                {main.compare_at_price && <s className="text-lg text-muted">{money(main.compare_at_price)}</s>}
                {off > 0 && <span className="rounded-md bg-brown px-2 py-0.5 text-sm font-bold text-white">{off}% off</span>}
              </p>
            )}
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
              <a href="#order" className="rounded-lg bg-primary px-8 py-3.5 text-base font-bold text-ink hover:bg-primary-hover">{cta}</a>
              {avg && <p className="text-sm text-ink/80"><Stars n={Math.round(Number(avg))} /> <b>{avg}</b> from {page.reviews.length} {page.reviews.length === 1 ? 'review' : 'reviews'}</p>}
            </div>
            {offerGifts.length > 0 && <p className="mt-4 inline-flex items-start gap-2 rounded-lg bg-white px-3 py-2 text-sm text-brown"><GiftIcon size={18} className="mt-px shrink-0" /><span><b>Free gifts included:</b> {offerGifts.map((g) => `${g.qty > 1 ? `${g.qty} × ` : ''}${g.name}`).join(', ')}</span></p>}
          </div>
          {page.hero_image && <img src={page.hero_image} alt="" className="aspect-[4/3] w-full rounded-2xl object-cover shadow-sm md:max-h-[420px]" />}
        </Container>
      </section>

      {page.benefits.length > 0 && (
        <Container className="mt-8 sm:mt-12">
          <div className="grid gap-3 sm:grid-cols-3">
            {page.benefits.map((b) => (
              <div key={b.title} className="flex items-start gap-3 rounded-xl border border-line p-4">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-tint text-brown"><CheckIcon size={18} /></span>
                <div><p className="font-semibold text-ink">{b.title}</p>{b.text && <p className="mt-0.5 text-sm text-muted">{b.text}</p>}</div>
              </div>
            ))}
          </div>
        </Container>
      )}

      {page.gallery.length > 0 && (
        <Container className="mt-8 sm:mt-12">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {page.gallery.map((g) => (
              <figure key={g.image_url} className="overflow-hidden rounded-xl border border-line">
                <div className="aspect-[4/3] bg-tint"><CatalogImage src={g.image_url} alt={g.caption || ''} className="h-full w-full" imageClassName="object-cover" fallbackText="" /></div>
                {g.caption && <figcaption className="px-3 py-2.5 text-center text-sm font-medium text-ink">{g.caption}</figcaption>}
              </figure>
            ))}
          </div>
        </Container>
      )}

      {page.body && (
        <Container className="mt-8 sm:mt-12">
          {htmlBody
            ? <div className="cms mx-auto max-w-3xl leading-relaxed text-ink/90" dangerouslySetInnerHTML={{ __html: page.body }} />
            : <div className="mx-auto max-w-3xl space-y-4 leading-relaxed text-ink/80">{String(page.body).split(/\n{2,}/).map((para, i) => <p key={i} className="whitespace-pre-line">{para}</p>)}</div>}
        </Container>
      )}

      {page.reviews.length > 0 && (
        <Container className="mt-10 sm:mt-14">
          <h2 className="mb-4 text-xl font-bold text-brown sm:text-2xl">What customers say</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {page.reviews.slice(0, 6).map((r, i) => (
              <figure key={i} className="rounded-xl border border-line p-4">
                <Stars n={r.rating} />
                {r.text && <blockquote className="mt-2 text-sm leading-relaxed text-ink/90">{r.text}</blockquote>}
                <figcaption className="mt-3 text-sm font-semibold text-ink">{r.name}</figcaption>
              </figure>
            ))}
          </div>
        </Container>
      )}

      <section className="mt-10 bg-footer text-white sm:mt-14">
        <Container className="flex flex-col items-center gap-4 py-9 text-center sm:py-12">
          <h2 className="text-2xl font-bold sm:text-3xl">Don’t miss out</h2>
          <p className="max-w-[40ch] text-white/80">{page.offer_note || 'This offer ends soon. Order today and pay when it arrives.'}</p>
          <Countdown until={page.offer_ends_at} />
          <a href="#order" className="mt-1 rounded-lg bg-primary px-9 py-3.5 text-base font-bold text-ink hover:bg-primary-hover">{cta}</a>
        </Container>
      </section>

      <Container className="mt-10 sm:mt-14">
        <div id="order" className="mx-auto max-w-xl scroll-mt-6"><LandingOrder page={page} /></div>
      </Container>

      <Container className="mt-10 sm:mt-14">
        <div className="grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-3">
          {[[CashIcon, 'Cash on delivery', 'Pay when your order arrives'], [TruckIcon, 'Fast delivery', s.delivery_area_text || 'Careful, on-time delivery'], [HeadsetIcon, 'Order support', s.contact_phone ? `Call ${s.contact_phone}` : 'We help if anything goes wrong']].map(([Icon, t, d]) => (
            <div key={t} className="flex items-center gap-3 bg-white px-5 py-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-tint text-brown"><Icon size={20} /></span><div><p className="text-sm font-semibold">{t}</p><p className="text-xs text-muted">{d}</p></div></div>
          ))}
        </div>
      </Container>

      {page.faq.length > 0 && (
        <Container className="mt-10 sm:mt-14">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-3 text-xl font-bold text-brown sm:text-2xl">Questions</h2>
            {page.faq.map((x) => (
              <details key={x.q} className="group border-b border-line py-3"><summary className="cursor-pointer list-none font-medium text-ink">{x.q}<span className="float-right text-muted group-open:rotate-45">+</span></summary><p className="mt-2 text-sm text-ink/80">{x.a}</p></details>
            ))}
          </div>
        </Container>
      )}

      <footer className="mt-12 bg-footer py-8 text-center text-sm text-white/70">
        <Container>
          <p className="font-semibold text-white">{s.site_name || 'Aayash E-Mart'}</p>
          <p className="mt-1">{[s.contact_phone, s.contact_email].filter(Boolean).join(' · ')}</p>
          <p className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1">{site.footerPages.filter((p, i, a) => a.findIndex((x) => x.title === p.title) === i).slice(0, 4).map((p) => <Link key={p.slug} href={`/pages/${p.slug}`} className="hover:text-white hover:underline">{p.title}</Link>)}<Link href="/" className="hover:text-white hover:underline">Visit our shop</Link></p>
        </Container>
      </footer>

      <StickyOrderBar price={main?.price} label={cta} />
    </div>
  );
}
