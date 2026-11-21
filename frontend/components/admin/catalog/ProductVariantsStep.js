import {
  inputClass,
  labelClass,
  mainButton,
} from './catalogApi';

export default function ProductVariantsStep({
  options,
  variants,
  optionDirty,
  onAddOption,
  onEditOption,
  onRemoveOption,
  onGenerate,
  onVariantChange,
  onSetDefault,
  onRemoveVariant,
}) {
  return (
    <div className="grid gap-5">
      <div>
        <h3 className="text-lg">Variant Options & Inventory</h3>
        <p className="mt-1 text-sm text-taupe-600">
          Example: Weight = 250g, 500g; or RAM = 8GB, 16GB and
          SSD = 256GB, 512GB.
        </p>
      </div>

      <section className="grid gap-3 rounded-xl border border-taupe-200 p-4">
        <div className="flex items-center justify-between">
          <h4 className="font-medium">Options</h4>
          <button
            type="button"
            className="text-sm font-medium text-primary-deep"
            onClick={onAddOption}
          >
            + Add Option
          </button>
        </div>

        {options.length === 0 && (
          <p className="text-sm text-taupe-600">
            No options (simple product with one SKU).
          </p>
        )}

        {options.map((option, index) => (
          <div
            key={index}
            className="grid gap-3 border-t border-taupe-100 py-3 md:grid-cols-[1fr_2fr_auto]"
          >
            <label className={labelClass}>
              Option Name
              <input
                className={inputClass}
                placeholder="RAM"
                value={option.name}
                onChange={event => onEditOption(index, { name: event.target.value })}
              />
            </label>

            <label className={labelClass}>
              Values (comma separated)
              <input
                className={inputClass}
                placeholder="8GB, 16GB"
                value={option.values.join(', ')}
                onChange={event => onEditOption(index, {
                  values: event.target.value.split(',').map(value => value.trim()),
                })}
              />
            </label>

            <button
              type="button"
              className="self-end pb-3 text-sm text-red-700"
              onClick={() => onRemoveOption(index)}
            >
              Remove
            </button>
          </div>
        ))}

        <button type="button" className={mainButton} onClick={onGenerate}>
          Generate / Update Variants
        </button>

        {optionDirty && (
          <p className="text-sm text-amber-700">
            Options changed. Regenerate before saving.
          </p>
        )}
      </section>

      <section className="grid gap-3">
        <h4 className="font-medium">SKU List ({variants.length})</h4>

        {variants.length === 0 && (
          <p className="text-sm text-taupe-600">
            Click Generate / Update Variants to create purchasable SKUs.
          </p>
        )}

        {variants.map((variant, index) => (
          <div
            key={variant.id || `${index}-${variant.label}`}
            className="grid gap-3 rounded-xl border border-taupe-200 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-medium">
                {variant.label || 'Variant'}{' '}
                {variant.id && (
                  <span className="text-xs text-taupe-600">#{variant.id}</span>
                )}
              </span>

              <label className="flex items-center gap-2 text-xs">
                <input
                  type="radio"
                  name="default-variant"
                  checked={!!variant.is_default}
                  onChange={() => onSetDefault(index)}
                />
                Default SKU
              </label>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <label className={labelClass}>
                SKU *
                <input
                  className={inputClass}
                  value={variant.sku || ''}
                  onChange={event => onVariantChange(
                    index,
                    'sku',
                    event.target.value.toUpperCase()
                  )}
                />
              </label>

              <label className={labelClass}>
                Selling Price (৳) *
                <input
                  className={inputClass}
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={variant.price}
                  onChange={event => onVariantChange(index, 'price', event.target.value)}
                />
              </label>

              <label className={labelClass}>
                Compare Price (৳)
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  step="0.01"
                  value={variant.compare_at_price ?? ''}
                  onChange={event => onVariantChange(
                    index,
                    'compare_at_price',
                    event.target.value
                  )}
                />
              </label>

              <label className={labelClass}>
                Stock *
                <input
                  className={inputClass}
                  type="number"
                  min="0"
                  step="1"
                  value={variant.stock}
                  onChange={event => onVariantChange(index, 'stock', event.target.value)}
                />
              </label>
            </div>

            <p className="text-xs text-taupe-600">
              {variant.selections.map(selection =>
                `${selection.option_code}: ${selection.value}`
              ).join(' · ') || 'Simple product'}
            </p>

            <button
              type="button"
              className="self-end text-xs text-red-700 hover:underline"
              onClick={() => onRemoveVariant(index)}
            >
              Remove SKU
            </button>
          </div>
        ))}
      </section>
    </div>
  );
}
