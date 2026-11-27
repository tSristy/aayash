import Link from 'next/link';
import CatalogImage from './CatalogImage';
import Container from './ui/Container';

/** Round category icons using each category's own picture. */
export default function CategoryRow({ categories }) {
  if (!categories.length) return null;
  return (
    <Container className="mt-8 sm:mt-10">
      <div className="flex gap-4 overflow-x-auto pb-2 sm:justify-center sm:gap-7 [scrollbar-width:none]">
        {categories.map((c) => (
          <Link key={c.id} href={`/products?category=${c.slug}`} className="group flex w-[76px] shrink-0 flex-col items-center gap-2 text-center sm:w-[96px]">
            <span className="block h-[68px] w-[68px] overflow-hidden rounded-full border border-line bg-tint transition-colors group-hover:border-brown sm:h-[88px] sm:w-[88px]">
              <CatalogImage src={c.image_url} alt={c.name} className="h-full w-full" imageClassName="object-cover" fallbackText="" />
            </span>
            <span className="text-xs font-medium leading-tight text-ink sm:text-sm">{c.name}</span>
          </Link>
        ))}
      </div>
    </Container>
  );
}
