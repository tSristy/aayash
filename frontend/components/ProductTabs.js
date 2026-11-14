'use client';
import { useState } from 'react';

const hint = 'mb-3.5 text-muted';

function Specs({ rows }) {
  return (
    <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      {rows.filter((r) => r[1]).map(([k, v]) => (
        <div key={k} className="grid gap-1 rounded-[14px] bg-tint px-[18px] py-4">
          <span className="text-[13px] text-muted">{k}</span>
          <strong>{v}</strong>
        </div>
      ))}
    </div>
  );
}

export default function ProductTabs({ product }) {
  const [tab, setTab] = useState('Details');
  const n = product.nutrition;
  const tabs = ['Details', 'Nutrition', 'Delivery', 'Reviews'];
  return (
    <section className="pt-10">
      <div className="mb-6 flex gap-7 overflow-x-auto border-b border-line" role="tablist">
        {tabs.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)}
            className={`whitespace-nowrap border-b-2 pb-3 ${tab === t ? 'border-primary font-bold text-ink' : 'border-transparent font-medium text-muted'}`}>
            {t}{t === 'Reviews' ? ` (${product.review_count})` : ''}
          </button>
        ))}
      </div>

      {tab === 'Details' && (
        <Specs rows={[['Brand', product.brand_name], ['Origin', product.origin], ['Storage', product.storage], ['Shelf life', product.shelf_life], ['Category', product.category_name]]} />
      )}
      {tab === 'Nutrition' && (n
        ? <><p className={hint}>Per 100 g</p><Specs rows={[['Calories', `${n.calories} kcal`], ['Protein', `${n.protein} g`], ['Carbs', `${n.carbs} g`], ['Fat', `${n.fat} g`]]} /></>
        : <p className={hint}>Nutrition details are not available for this product.</p>)}
      {tab === 'Delivery' && (
        <Specs rows={[['Delivery area', 'Dhaka city'], ['Delivery time', 'Same day for orders before 4 pm'], ['Delivery fee', '৳60, free over ৳1,000'], ['Payment', 'Cash on delivery'], ['Refunds', 'Not fresh? Tell us within 24 hours for a refund or replacement']]} />
      )}
      {tab === 'Reviews' && (
        <div className="grid max-w-[680px] gap-3.5">
          {product.reviews.length === 0 && <p className={hint}>No reviews yet.</p>}
          {product.reviews.map((r, i) => (
            <div key={i} className="border-b border-line pb-3.5">
              <p><strong>{r.author}</strong> <span className="ml-2 text-primary-deep">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span></p>
              <p>{r.body}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
