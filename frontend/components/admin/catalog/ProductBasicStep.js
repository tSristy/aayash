import { inputClass, labelClass, slugify } from './catalogApi';

export default function ProductBasicStep({
  product,
  categories,
  brands,
  productTypes,
  slugTouched,
  onSlugTouched,
  onChange,
  onSelectType,
}) {
  const available = (rows, selectedId) =>
    rows.filter(row => row.is_active || String(row.id) === String(selectedId));

  function changeName(name) {
    onChange('name', name);

    if (!slugTouched) {
      onChange('slug', slugify(name));
    }
  }

  return (
    <div className="grid gap-4">
      <h3 className="text-lg">Basic Product Information</h3>

      <label className={labelClass}>
        Product Name *
        <input
          className={inputClass}
          maxLength={200}
          value={product.name}
          onChange={event => changeName(event.target.value)}
        />
      </label>

      <label className={labelClass}>
        Product URL Slug *
        <input
          className={inputClass}
          value={product.slug}
          onChange={event => {
            onSlugTouched();
            onChange('slug', slugify(event.target.value));
          }}
        />
      </label>

      <div className="grid gap-4 md:grid-cols-3">
        <label className={labelClass}>
          Category *
          <select
            className={inputClass}
            value={product.category_id}
            onChange={event => onChange('category_id', event.target.value)}
          >
            <option value="">Select Category</option>
            {available(categories, product.category_id).map(category => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          Brand
          <select
            className={inputClass}
            value={product.brand_id}
            onChange={event => onChange('brand_id', event.target.value)}
          >
            <option value="">No Brand</option>
            {available(brands, product.brand_id).map(brand => (
              <option key={brand.id} value={brand.id}>{brand.name}</option>
            ))}
          </select>
        </label>

        <label className={labelClass}>
          Product Type *
          <select
            className={inputClass}
            value={product.product_type_id}
            onChange={event => onSelectType(event.target.value)}
          >
            <option value="">Select Type</option>
            {available(productTypes, product.product_type_id).map(type => (
              <option key={type.id} value={type.id}>{type.name}</option>
            ))}
          </select>
        </label>
      </div>

      <label className={labelClass}>
        Short Description
        <textarea
          rows={2}
          maxLength={300}
          className={inputClass}
          value={product.short_desc}
          onChange={event => onChange('short_desc', event.target.value)}
        />
      </label>

      <label className={labelClass}>
        Full Description
        <textarea
          rows={5}
          className={inputClass}
          value={product.description}
          onChange={event => onChange('description', event.target.value)}
        />
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={product.is_featured}
          onChange={event => onChange('is_featured', event.target.checked)}
        />
        Featured Product
      </label>
    </div>
  );
}
