'use client';
import { useState } from 'react';

function Specs({ rows }) {
  return (
    <div className="specs">
      {rows.filter((r) => r[1]).map(([k, v]) => (
        <div className="spec" key={k}><span>{k}</span><strong>{v}</strong></div>
      ))}
    </div>
  );
}

export default function ProductTabs({ product }) {
  const [tab, setTab] = useState('Details');
  const n = product.nutrition;
  const tabs = ['Details', 'Nutrition', 'Delivery', 'Reviews'];
  return (
    <section className="tabs-section">
      <div className="tabs" role="tablist">
        {tabs.map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>
            {t}{t === 'Reviews' ? ` (${product.review_count})` : ''}
          </button>
        ))}
      </div>

      {tab === 'Details' && (
        <Specs rows={[['Brand', product.brand_name], ['Origin', product.origin], ['Storage', product.storage], ['Shelf life', product.shelf_life], ['Category', product.category_name]]} />
      )}
      {tab === 'Nutrition' && (n
        ? <><p className="tab-hint">Per 100 g</p><Specs rows={[['Calories', `${n.calories} kcal`], ['Protein', `${n.protein} g`], ['Carbs', `${n.carbs} g`], ['Fat', `${n.fat} g`]]} /></>
        : <p className="tab-hint">Nutrition details are not available for this product.</p>)}
      {tab === 'Delivery' && (
        <Specs rows={[['Delivery area', 'Dhaka city'], ['Delivery time', 'Same day for orders before 4 pm'], ['Delivery fee', '৳60, free over ৳1,000'], ['Payment', 'Cash on delivery'], ['Refunds', 'Not fresh? Tell us within 24 hours for a refund or replacement']]} />
      )}
      {tab === 'Reviews' && (
        <div className="reviews">
          {product.reviews.length === 0 && <p className="tab-hint">No reviews yet.</p>}
          {product.reviews.map((r, i) => (
            <div className="review" key={i}>
              <p><strong>{r.author}</strong> <span className="stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span></p>
              <p>{r.body}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
