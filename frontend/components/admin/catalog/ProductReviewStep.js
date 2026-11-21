import { secondaryButton } from './catalogApi';

function ReviewCard({ title, step, count, onEdit, children }) {
  return (
    <section className="overflow-hidden rounded-xl border border-taupe-200 bg-white">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-taupe-100 bg-taupe-50 px-4 py-3">
        <div>
          <h4 className="font-medium">{step}. {title}</h4>
          <p className="mt-0.5 text-xs text-taupe-600">{count}</p>
        </div>
        <button
          className={`${secondaryButton} !px-3 !py-1.5 text-xs`}
          type="button"
          onClick={() => onEdit(step - 1)}
        >
          Edit Step
        </button>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function SummaryRow({ label, value }) {
  return (
    <div className="flex min-w-0 justify-between gap-4 border-b border-taupe-100 py-2 text-sm last:border-0">
      <span className="shrink-0 text-taupe-600">{label}</span>
      <span className="min-w-0 break-words text-right font-medium">{value || '—'}</span>
    </div>
  );
}

function formattedPrice(value) {
  if (value === '' || value == null || Number.isNaN(Number(value))) {
    return 'Not set';
  }

  return `৳${Number(value).toLocaleString('en-BD', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function displayValue(value) {
  if (Array.isArray(value)) {
    return value.join(', ') || '—';
  }

  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }

  return value === '' || value == null ? '—' : String(value);
}

export default function ProductReviewStep({
  product,
  categories,
  brands,
  selectedType,
  assignments,
  onEditStep,
  optionDirty,
}) {
  const category = categories.find(row => String(row.id) === String(product.category_id));
  const brand = brands.find(row => String(row.id) === String(product.brand_id));
  const selectedSpecs = assignments.filter(assignment => {
    const value = product.specifications[assignment.attribute_id];
    return value !== undefined && value !== '' && value !== null &&
      (!Array.isArray(value) || value.length > 0);
  });
  const defaultSku = product.variants.find(variant => variant.is_default);
  const defaultCount = product.variants.filter(variant => variant.is_default).length;
  const completeImages = product.images.filter(image => image.url?.trim());
  const totalStock = product.variants.reduce((total, variant) =>
    total + (Number(variant.stock) || 0), 0
  );
  const missing = [];

  if (!product.name.trim() || !product.slug.trim()) {
    missing.push('Add a product name and URL slug.');
  }

  if (!product.category_id || !product.product_type_id) {
    missing.push('Choose a category and a product type.');
  }

  if (!product.variants.length || defaultCount !== 1) {
    missing.push('Generate variants and select exactly one default SKU.');
  }

  if (optionDirty) {
    missing.push('Regenerate variants after changing the option values.');
  }

  const missingRequired = assignments.filter(assignment => {
    if (!assignment.is_required) {
      return false;
    }

    const value = product.specifications[assignment.attribute_id];
    return value === undefined || value === null || value === '' ||
      (Array.isArray(value) && value.length === 0);
  });

  if (missingRequired.length) {
    missing.push(`Complete required specifications: ${missingRequired.map(item =>
      item.attribute.name
    ).join(', ')}.`);
  }

  return (
    <div className="grid gap-4">
      <div>
        <h3 className="text-lg">Review & Publish</h3>
        <p className="mt-1 text-sm text-taupe-600">
          Review everything from the previous four steps before saving.
          Use Edit Step to correct any detail.
        </p>
      </div>

      {missing.length > 0 ? (
        <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h4 className="font-medium text-amber-900">Before publishing</h4>
          <ul className="mt-2 list-disc pl-5 text-sm text-amber-800">
            {missing.map(message => <li key={message}>{message}</li>)}
          </ul>
        </div>
      ) : (
        <p className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-800">
          Basic review checks look complete. The backend performs final validation when you publish.
        </p>
      )}

      <ReviewCard title="Basic Details" step={1} count="Product identity" onEdit={onEditStep}>
        <SummaryRow label="Name" value={product.name} />
        <SummaryRow label="Slug" value={product.slug} />
        <SummaryRow label="Category" value={category?.name} />
        <SummaryRow label="Brand" value={brand?.name || 'No Brand'} />
        <SummaryRow label="Type" value={selectedType?.name} />
        <SummaryRow label="Short Description" value={product.short_desc} />
        <SummaryRow label="Full Description" value={product.description.length > 180 ? `${product.description.slice(0, 180)}…` : product.description} />
        <SummaryRow label="Featured" value={product.is_featured ? 'Yes' : 'No'} />
      </ReviewCard>

      <ReviewCard
        title="Specifications"
        step={2}
        count={`${selectedSpecs.length} completed of ${assignments.length} assigned fields`}
        onEdit={onEditStep}
      >
        {selectedSpecs.length ? selectedSpecs.map(assignment => (
          <SummaryRow
            key={assignment.attribute_id}
            label={`${assignment.attribute.name}${assignment.attribute.unit
              ? ` (${assignment.attribute.unit})`
              : ''}`}
            value={displayValue(product.specifications[assignment.attribute_id])}
          />
        )) : <p className="text-sm text-taupe-600">No specifications entered.</p>}
      </ReviewCard>

      <ReviewCard
        title="Product Images"
        step={3}
        count={`${completeImages.length} gallery images`}
        onEdit={onEditStep}
      >
        {completeImages.length ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {completeImages.map((image, index) => (
              <div key={`${index}-${image.url}`} className="overflow-hidden rounded-lg border border-taupe-200">
                <img
                  src={image.url}
                  alt={image.alt || `Gallery image ${index + 1}`}
                  className="h-24 w-full bg-taupe-50 object-contain"
                />
                <div className="px-2 py-2 text-xs">
                  <p className="font-medium">{index === 0 ? 'Main Image' : `Image ${index + 1}`}</p>
                  <p className="truncate text-taupe-600">{image.variant_sku || 'All variants'}</p>
                </div>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-taupe-600">No gallery images added.</p>}
      </ReviewCard>

      <ReviewCard
        title="Variants & Pricing"
        step={4}
        count={`${product.variants.length} SKU(s) · ${totalStock} units in stock`}
        onEdit={onEditStep}
      >
        <SummaryRow label="Variant Options" value={product.options.map(option =>
          `${option.name}: ${option.values.join(', ')}`
        ).join(' · ') || 'Simple Product'} />
        <SummaryRow label="Default SKU" value={defaultSku?.sku} />

        <div className="mt-3 overflow-x-auto">
          <table className="w-full min-w-[430px] text-left text-sm">
            <thead className="bg-taupe-50">
              <tr>
                <th className="p-2">Variant</th>
                <th className="p-2">SKU</th>
                <th className="p-2">Price</th>
                <th className="p-2">Stock</th>
              </tr>
            </thead>
            <tbody>
              {product.variants.map((variant, index) => (
                <tr key={variant.id || index} className="border-b border-taupe-100">
                  <td className="p-2">{variant.label}</td>
                  <td className="p-2 font-medium">{variant.sku || 'Not set'}</td>
                  <td className="p-2">{formattedPrice(variant.price)}</td>
                  <td className="p-2">{variant.stock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </ReviewCard>

      <p className="text-sm leading-relaxed text-taupe-600">
        Save Draft keeps the product hidden. Publish validates required
        specifications, SKU, pricing and the selected default variant.
      </p>
    </div>
  );
}
