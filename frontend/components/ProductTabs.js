'use client';

import ReviewForm from './ReviewForm';
import { useState, useEffect } from 'react';

const hintClass = 'mb-3.5 text-muted';

function Specifications({ rows }) {
  return (
    <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
      {rows.filter((row) => row[1] !== null && row[1] !== undefined && row[1] !== '').map(([name, value]) => (
        <div key={name} className="grid gap-1 rounded-[14px] bg-tint px-[18px] py-4">
          <span className="text-[13px] text-muted">{name}</span>
          <strong>{Array.isArray(value) ? value.join(', ') : String(value)}</strong>
        </div>
      ))}
    </div>
  );
}

export default function ProductTabs({ product }) {
  const [tab, setTab] = useState('Details');
  const [zones, setZones] = useState([]);
  useEffect(() => {
    // Delivery charges come from the database (Admin → Delivery), grouped by zone.
    fetch('/api/locations').then((r) => r.json()).then((d) => {
      const byZone = new Map();
      (d.cities || []).forEach((c) => { const cur = byZone.get(c.zone); byZone.set(c.zone, cur === undefined ? c.charge : Math.min(cur, c.charge)); });
      setZones([...byZone].map(([name, charge]) => ({ name, charge })));
    }).catch(() => {});
  }, []);
  const nutrition = product.nutrition;
  const specifications = (product.specifications || []).map((item) => [
    item.name,
    typeof item.value === 'boolean' ? (item.value ? 'Yes' : 'No') : (
      item.unit && item.value != null
        ? `${item.value} ${item.unit}`
        : item.value
    ),
  ]);

  const details = [
    ['Brand', product.brand_name],
    ['Category', product.category_name],
    ...specifications,
  ];

  if (specifications.length === 0) {
    details.push(
      ['Origin', product.origin],
      ['Storage', product.storage],
      ['Shelf life', product.shelf_life]
    );
  }

  const tabs = [
    'Details',
    ...(nutrition ? ['Nutrition'] : []),
    'Delivery',
    'Reviews',
  ];

  return (
    <section className="pt-10">
      <div className="mb-6 flex gap-7 overflow-x-auto border-b border-line" role="tablist">
        {tabs.map((name) => (
          <button
            type="button"
            key={name}
            role="tab"
            aria-selected={tab === name}
            onClick={() => setTab(name)}
            className={`whitespace-nowrap border-b-2 pb-3 ${
              tab === name
                ? 'border-primary font-bold text-ink'
                : 'border-transparent font-medium text-muted'
            }`}
          >
            {name}
            {name === 'Reviews' ? ` (${product.review_count || 0})` : ''}
          </button>
        ))}
      </div>

      {tab === 'Details' && <Specifications rows={details} />}

      {tab === 'Nutrition' && nutrition && (
        <>
          <p className={hintClass}>Supplier-provided nutrition information</p>
          <Specifications rows={[
            ['Calories', nutrition.calories != null ? `${nutrition.calories} kcal` : null],
            ['Protein', nutrition.protein != null ? `${nutrition.protein} g` : null],
            ['Carbs', nutrition.carbs != null ? `${nutrition.carbs} g` : null],
            ['Fat', nutrition.fat != null ? `${nutrition.fat} g` : null],
          ]} />
        </>
      )}

      {tab === 'Delivery' && <Specifications rows={[...zones.map((z) => [z.name, z.charge === 0 ? 'Free' : `৳${z.charge}`]), ['Payment', 'Cash on Delivery'], ['Delivery time', 'Confirmed after order placement']]} />}

      {tab === 'Reviews' && (
        <div className="grid max-w-[680px] gap-3.5">
          <ReviewForm slug={product.slug} />
          {(!product.reviews || product.reviews.length === 0) && (
            <p className={hintClass}>No reviews yet.</p>
          )}
          {(product.reviews || []).map((review, index) => (
            <div key={index} className="border-b border-line pb-3.5">
              <p>
                <strong>{review.author}</strong>{' '}
                <span className="ml-2 text-brown">
                  {'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}
                </span>
              </p>
              <p>{review.body}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
