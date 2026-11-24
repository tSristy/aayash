import CatalogImage from './CatalogImage';

export default function ProductVisual({ product, large = false }) {
  return (
    <div className={`aspect-square overflow-hidden border border-[#E2D9CE] ${large ? 'bg-white' : 'bg-[#F5F1EB]'}`}>
      <CatalogImage
        src={product.image_url}
        alt={product.name}
        className="h-full w-full"
        imageClassName="object-cover"
      />
    </div>
  );
}
