const TINTS = ['bg-tint', 'bg-tint-2', 'bg-tint-3', 'bg-tint-4', 'bg-tint-5'];

export default function ProductVisual({ product, large = false }) {
  return (
    <div className={`grid aspect-square place-items-center overflow-hidden border border-[#E2D9CE] ${large ? 'bg-white' : 'bg-[#F5F1EB]'}`}>
      {product.image_url
        ? <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
        : <span role="img" aria-label={product.name} className={`leading-none ${large ? 'text-[180px]' : 'text-7xl'}`}>{product.emoji}</span>}
    </div>
  );
}