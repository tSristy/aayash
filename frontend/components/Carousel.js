'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay, Pagination } from 'swiper/modules';
import ProductCard from './ProductCard';
import 'swiper/css';
import 'swiper/css/pagination';

function CategoryRow({ section, index }) {
  const [progress, setProgress] = useState(100);
  const [canSlide, setCanSlide] = useState(section.items.length > 1);
  const prevClass = `catalog-prev-${index}`;
  const nextClass = `catalog-next-${index}`;

  function updateProgress(swiper) {
    if (!swiper || swiper.destroyed) return;

    // A row with fewer items than the viewport should show clean product cards,
    // not nonfunctional arrows or a fake carousel progress indicator.
    const slidesPossible = !swiper.isLocked && swiper.slides.length > 1;
    setCanSlide(slidesPossible);
    const total = swiper.snapGrid?.length || 1;
    const current = (swiper.snapIndex || 0) + 1;
    setProgress(Math.min(100, Math.round((current / total) * 100)));
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-4 border-b border-[#E2D9CE] pb-3">
        <h2 className="font-serif text-2xl font-bold text-[#2E261F]">
          {section.cat.name}
        </h2>
        <Link
          href={`/products?category=${encodeURIComponent(section.cat.slug)}`}
          className="text-xs font-semibold uppercase tracking-widest text-primary-deep hover:underline"
        >
          View all items →
        </Link>
      </div>

      {canSlide && (
        <div className="mb-5 h-[4px] w-full overflow-hidden bg-[#E2D9CE]">
          <div
            className="h-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      <div className="group relative">
        {/* Keep navigation elements mounted across breakpoint changes. */}
        <button
          type="button"
          aria-label={`Previous ${section.cat.name} products`}
          tabIndex={canSlide ? 0 : -1}
          aria-hidden={!canSlide}
          className={`${prevClass} absolute left-2 top-[42%] z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white shadow-md transition-colors hover:bg-black/75 ${
            canSlide ? '' : 'pointer-events-none opacity-0'
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <button
          type="button"
          aria-label={`Next ${section.cat.name} products`}
          tabIndex={canSlide ? 0 : -1}
          aria-hidden={!canSlide}
          className={`${nextClass} absolute right-2 top-[42%] z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/55 text-white shadow-md transition-colors hover:bg-black/75 ${
            canSlide ? '' : 'pointer-events-none opacity-0'
          }`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <Swiper
          modules={[Navigation, Autoplay, Pagination]}
          watchOverflow
          rewind
          autoplay={section.items.length > 1 ? {
            delay: 3500,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          } : false}
          navigation={{
            prevEl: `.${prevClass}`,
            nextEl: `.${nextClass}`,
          }}
          pagination={{ clickable: true }}
          onSwiper={updateProgress}
          onSlideChange={updateProgress}
          onBreakpoint={updateProgress}
          onResize={updateProgress}
          spaceBetween={16}
          slidesPerView={1.25}
          breakpoints={{
            640: { slidesPerView: 2.1 },
            768: { slidesPerView: 3 },
            1024: { slidesPerView: 4 },
          }}
          className={`!pb-10 [&_.swiper-pagination-bullet]:!bg-primary ${
            canSlide ? '' : '[&_.swiper-pagination]:!hidden'
          }`}
        >
          {section.items.map((product) => (
            <SwiperSlide key={product.id} className="!h-auto">
              <ProductCard p={product} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
}

export default function Carousel({ sections }) {
  const populated = (sections || []).filter((section) => section.items?.length);
  if (!populated.length) return null;

  return (
    <div className="space-y-14">
      {populated.map((section, index) => (
        <CategoryRow key={section.cat.id} section={section} index={index} />
      ))}
    </div>
  );
}
