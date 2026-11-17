'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Autoplay, Pagination } from 'swiper/modules';
import ProductCard from './ProductCard';
import 'swiper/css';
import 'swiper/css/pagination';

function CategoryRow({ section, index }) {
  const [progress, setProgress] = useState(0);

  const updateProgress = (swiper) => {
    const total = swiper.snapGrid?.length || 1;
    const step = (swiper.snapIndex ?? 0) + 1;
    setProgress(Math.min(100, Math.round((step / total) * 100)));
  };

  const prevClass = `cat-prev-${index}`;
  const nextClass = `cat-next-${index}`;

  return (
    <div>
     
      <div className="mb-4 flex items-center justify-between gap-4 border-b border-[#E2D9CE] pb-3">
        <h2 className="font-serif text-2xl font-bold text-[#2E261F]">
          {section.cat.name}
        </h2>

        <Link
          href={`/products?category=${section.cat.slug}`}
          className="text-xs font-semibold uppercase tracking-widest text-[#A65A3E] hover:underline"
        >
          View all items →
        </Link>
      </div>

      <div className="mb-5 h-[4px] w-full overflow-hidden bg-[#E2D9CE]">
        <div
          className="h-full bg-[#A65A3E] transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      <div className="group relative">
       
        <button
          type="button"
          aria-label="Previous slide"
          className={`${prevClass} absolute left-2 top-[42%] z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white shadow-md backdrop-blur-sm transition-colors hover:bg-black/75 disabled:opacity-30`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>

       
        <button
          type="button"
          aria-label="Next slide"
          className={`${nextClass} absolute right-2 top-[42%] z-20 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white shadow-md backdrop-blur-sm transition-colors hover:bg-black/75 disabled:opacity-30`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </button>

        <Swiper
          modules={[Navigation, Autoplay, Pagination]}
          loop={false}
          rewind={true}
          autoplay={{
            delay: 3000,
            disableOnInteraction: false,
            pauseOnMouseEnter: true,
          }}
          pagination={{ clickable: true }}
          navigation={{
            prevEl: `.${prevClass}`,
            nextEl: `.${nextClass}`,
          }}
          onSwiper={updateProgress}
          onSlideChange={updateProgress}
          onBreakpoint={updateProgress}
          spaceBetween={20}
          slidesPerView={1.2}
          breakpoints={{
            640: { slidesPerView: 2.2 },
            768: { slidesPerView: 3 },
            1024: { slidesPerView: 4 },
          }}
          className="!pb-12 [&_.swiper-pagination-bullet]:!mx-1.5 [&_.swiper-pagination-bullet]:!h-2.5 [&_.swiper-pagination-bullet]:!w-2.5 [&_.swiper-pagination-bullet]:!rounded-full [&_.swiper-pagination-bullet]:!border-2 [&_.swiper-pagination-bullet]:!border-[#2E261F]/40 [&_.swiper-pagination-bullet]:!bg-transparent [&_.swiper-pagination-bullet]:!opacity-100 [&_.swiper-pagination-bullet]:!transition-all [&_.swiper-pagination-bullet]:!duration-300 [&_.swiper-pagination-bullet.swiper-pagination-bullet-active]:!w-8 [&_.swiper-pagination-bullet.swiper-pagination-bullet-active]:!border-[#A65A3E] [&_.swiper-pagination-bullet.swiper-pagination-bullet-active]:!bg-[#A65A3E]"
        >
          {section.items.map((p) => (
            <SwiperSlide key={p.id} className="!h-auto">
              <ProductCard p={p} />
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  );
}

export default function Carousel({ sections }) {
  if (!sections?.length) return null;

  return (
    <div className="space-y-14">
      {sections.map((section, idx) => (
        <CategoryRow key={section.cat.id} section={section} index={idx} />
      ))}
    </div>
  );
}