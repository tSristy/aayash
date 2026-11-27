import Link from 'next/link';
import Container from './ui/Container';

/** Admin-managed promo pictures for one placement. Up to three show as cards in one row. */
export default function Banners({ items = [], className = 'mt-10' }) {
  if (!items.length) return null;
  const cols = items.length >= 3 ? 'md:grid-cols-3' : items.length === 2 ? 'sm:grid-cols-2' : '';
  return (
    <Container className={className}>
      <div className={`flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1 [scrollbar-width:none] sm:grid sm:gap-4 sm:overflow-visible ${cols}`}>
        {items.map((b) => {
          const card = <img src={b.image_url} alt={b.title || 'Promotion'} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" loading="lazy" />;
          const cls = 'group block aspect-[16/9] w-[82%] shrink-0 snap-start overflow-hidden rounded-xl border border-line bg-tint sm:w-auto';
          return b.link_url ? <Link key={b.id} href={b.link_url} className={cls}>{card}</Link> : <div key={b.id} className={cls}>{card}</div>;
        })}
      </div>
    </Container>
  );
}
