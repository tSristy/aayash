import CatalogImage from './CatalogImage';

export default function ProductVisual({ product, large = false }) {
  return (
    <div className={`aspect-square overflow-hidden rounded-xl border border-line ${large ? 'bg-white' : 'bg-tint'}`}>
      <CatalogImage src={product.image_url} alt={product.name} className="h-full w-full" imageClassName="object-cover" />
    </div>
  );
}
