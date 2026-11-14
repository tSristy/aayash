const TINTS = ['#FFF1E0', '#FDE9D6', '#F8EBDD', '#FFF5E3', '#FBE5D0'];

// Shows the product photo when image_url exists, otherwise a tinted tile with the product emoji.
export default function ProductVisual({ product, large = false }) {
  const tint = TINTS[product.id % TINTS.length];
  return (
    <div className={`visual${large ? ' visual-lg' : ''}`} style={{ background: tint }}>
      {product.image_url
        ? <img src={product.image_url} alt={product.name} />
        : <span role="img" aria-label={product.name}>{product.emoji}</span>}
    </div>
  );
}
