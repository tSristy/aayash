const TINTS = ['bg-tint', 'bg-tint-2', 'bg-tint-3', 'bg-tint-4', 'bg-tint-5'];

// Shows the product photo when image_url exists, otherwise a tinted tile with the product emoji.
export default function ProductVisual({ product, large = false }) {
  return (
    <div className={`grid aspect-square place-items-center overflow-hidden ${large ? 'rounded-3xl bg-white' : `rounded-[14px] ${TINTS[product.id % TINTS.length]}`}`}>
      {product.image_url
        ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
        : <span role="img" aria-label={product.name} className={`leading-none ${large ? 'text-[180px]' : 'text-7xl'}`}>{product.emoji}</span>}
    </div>
  );
}
