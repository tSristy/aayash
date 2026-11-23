'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useCart } from './CartContext';
import Button from './ui/Button';
import Badge from './ui/Badge';
import Stepper from './ui/Stepper';
import { money } from '@/lib/format';

const labelClass = 'mb-2 text-xs font-semibold uppercase tracking-widest text-stone-500';
const storePhone = process.env.NEXT_PUBLIC_STORE_PHONE || '';
const whatsAppNumber = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '';

function initialSelection(product) {
  const defaultVariant = product.variants.find((variant) => variant.is_default)
    || product.variants[0];
  const selected = {};

  for (const option of product.options || []) {
    const matched = option.values.find((value) => (
      defaultVariant?.optionValueIds?.includes(value.id)
    ));

    if (matched) {
      selected[option.id] = matched.id;
    }
  }

  return selected;
}

export default function ProductBuy({ product }) {
  const router = useRouter();
  const { add } = useCart();
  const [selected, setSelected] = useState(() => initialSelection(product));
  const [fallbackId, setFallbackId] = useState(() => (
    product.variants.find((variant) => variant.is_default)?.id
    || product.variants[0]?.id
  ));
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const [liked, setLiked] = useState(false);
  const [shared, setShared] = useState(false);

  const options = (product.options || []).filter((option) => option.values.length);
  const chosenValues = Object.values(selected);
  const variant = options.length
    ? product.variants.find((candidate) => (
        chosenValues.length === options.length
        && chosenValues.every((valueId) => candidate.optionValueIds?.includes(valueId))
        && candidate.optionValueIds?.length === options.length
      ))
    : product.variants.find((candidate) => candidate.id === fallbackId);

  const inStock = Boolean(variant && variant.stock > 0);
  const unitPrice = Number(variant?.price || 0);
  const discountPercent = variant?.compare_at_price
    ? Math.round((1 - unitPrice / Number(variant.compare_at_price)) * 100)
    : 0;

  function changeOption(optionId, valueId) {
    setSelected((previous) => ({ ...previous, [optionId]: valueId }));
    setQty(1);
  }

  function addToCart() {
    if (!inStock || !variant) {
      return;
    }

    add({
      variantId: variant.id,
      productId: product.id,
      slug: product.slug,
      name: product.name,
      label: variant.label,
      price: unitPrice,
      emoji: product.emoji,
      image: product.image_url,
    }, qty);
  }

  function onAdd() {
    addToCart();
    setAdded(true);
    setTimeout(() => setAdded(false), 1400);
  }

  function onBuy() {
    addToCart();
    router.push('/cart');
  }

  async function onShare() {
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, url: location.href });
      } else {
        await navigator.clipboard.writeText(location.href);
        setShared(true);
        setTimeout(() => setShared(false), 1500);
      }
    } catch {
      // The user may close the native share dialog.
    }
  }

  const message = encodeURIComponent(
    `Hello Ayashmart, I want to order ${product.name} (${variant?.label || 'please advise'}) × ${qty}.`
  );

  return (
    <div>
      <p className="flex flex-wrap items-baseline gap-2 font-serif text-[34px] font-normal text-[#2E261F]">
        {variant ? money(unitPrice) : 'Select a configuration'}
        {variant && (
          <small className="font-sans text-sm font-normal text-stone-500">
            / {variant.label}
          </small>
        )}
        {variant?.compare_at_price && (
          <s className="font-sans text-base font-normal text-stone-400">
            {money(variant.compare_at_price)}
          </s>
        )}
        {discountPercent > 0 && <Badge>{discountPercent}% off</Badge>}
      </p>
      <p className="mb-[18px] text-xs text-stone-500">
        Delivery: ৳70 inside Dhaka city / ৳120 outside Dhaka city.
      </p>
      <p className="mb-6 max-w-[56ch] text-sm leading-relaxed text-stone-600">
        {product.description}
      </p>

      {options.length > 0 ? (
        <div className="grid gap-5 pb-5">
          {options.map((option) => (
            <div key={option.id}>
              <p className={labelClass}>{option.name}</p>
              <div
                role="radiogroup"
                aria-label={option.name}
                className="flex flex-wrap gap-2.5"
              >
                {option.values.map((value) => (
                  <button
                    type="button"
                    key={value.id}
                    role="radio"
                    aria-checked={selected[option.id] === value.id}
                    onClick={() => changeOption(option.id, value.id)}
                    className={`border px-4 py-2.5 text-sm transition-colors ${
                      selected[option.id] === value.id
                        ? 'border-[#A65A3E] bg-[#F5F1EB] font-semibold text-[#2E261F]'
                        : 'border-[#E2D9CE] bg-white text-stone-700 hover:border-[#2E261F]'
                    }`}
                  >
                    {value.value}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mb-[22px]">
          <p className={labelClass}>Available choices</p>
          <div role="radiogroup" aria-label="Product choice" className="flex flex-wrap gap-2.5">
            {product.variants.map((candidate) => (
              <button
                type="button"
                key={candidate.id}
                role="radio"
                aria-checked={fallbackId === candidate.id}
                disabled={candidate.stock < 1}
                onClick={() => { setFallbackId(candidate.id); setQty(1); }}
                className={`border px-4 py-2.5 text-sm disabled:opacity-40 ${
                  fallbackId === candidate.id
                    ? 'border-[#A65A3E] bg-[#F5F1EB] font-semibold'
                    : 'border-[#E2D9CE] bg-white'
                }`}
              >
                {candidate.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className={labelClass}>Quantity</p>
      <div className="mb-6 flex flex-wrap items-center gap-5">
        <Stepper value={qty} onChange={setQty} max={variant?.stock || 1} />
        <p className="text-sm text-stone-500">
          Total: <strong className="text-[#2E261F]">{money(unitPrice * qty)}</strong>
        </p>
        <p className={`text-xs font-semibold uppercase tracking-wider ${
          inStock ? 'text-emerald-700' : 'text-[#A65A3E]'
        }`}>
          {inStock ? `In stock (${variant.stock})` : 'Unavailable'}
        </p>
      </div>

      <div className="mb-3 grid max-w-[480px] grid-cols-[1.4fr_1fr] gap-3">
        <Button size="lg" variant={added ? 'dark' : 'primary'} onClick={onAdd} disabled={!inStock}>
          {added ? 'Added to cart' : 'Add to cart'}
        </Button>
        <Button size="lg" variant="outline" onClick={onBuy} disabled={!inStock}>
          Buy now
        </Button>
      </div>

      {(whatsAppNumber || storePhone) && (
        <div className="mb-3 grid max-w-[480px] grid-cols-2 gap-3">
          {whatsAppNumber && (
            <a
              href={`https://wa.me/${whatsAppNumber}?text=${message}`}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-[#E2D9CE] px-4 py-3 text-center text-xs font-semibold uppercase tracking-widest"
            >
              Order on WhatsApp
            </a>
          )}
          {storePhone && (
            <a
              href={`tel:${storePhone}`}
              className="border border-[#E2D9CE] px-4 py-3 text-center text-xs font-semibold uppercase tracking-widest"
            >
              Call for Order
            </a>
          )}
        </div>
      )}

      <div className="flex max-w-[480px] gap-6 border-t border-[#E2D9CE] pt-4 text-xs font-medium uppercase tracking-wider text-stone-500">
        <button type="button" onClick={() => setLiked(!liked)} aria-pressed={liked}>
          {liked ? '♥ Saved' : '♡ Save for later'}
        </button>
        <button type="button" onClick={onShare}>
          {shared ? 'Link copied' : 'Share'}
        </button>
      </div>
    </div>
  );
}
