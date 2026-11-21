import { slugify } from './catalogApi';

export const PRODUCT_STEPS = [
  'Basic Details',
  'Specifications',
  'Product Images',
  'Variants & Pricing',
  'Review & Publish',
];

export function blankProduct() {
  return {
    name: '',
    slug: '',
    category_id: '',
    brand_id: '',
    product_type_id: '',
    short_desc: '',
    description: '',
    is_featured: false,
    status: 'draft',
    specifications: {},
    options: [],
    variants: [],
    images: [],
  };
}

export function allowedValues(attribute) {
  const choices = attribute.allowed_values_json;

  if (Array.isArray(choices)) {
    return choices;
  }

  if (typeof choices === 'string') {
    try {
      const parsed = JSON.parse(choices);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  return [];
}

export function variantCombinationKey(selections) {
  const sorted = [...selections].sort((a, b) =>
    a.option_code.localeCompare(b.option_code)
  );

  return JSON.stringify(sorted);
}

function variantLabel(selections) {
  return selections.length
    ? selections.map(selection => selection.value).join(' / ')
    : 'Default';
}

function priceText(value) {
  return value == null ? '' : String(value);
}

/**
 * Generate only meaningful combinations, preserving existing variant IDs.
 * Exactly one SKU is marked default, including after regeneration.
 */
export function generateVariants(options, previous = [], slug = 'product') {
  const previousByCombination = new Map(
    previous.map(variant => [
      variantCombinationKey(variant.selections || []),
      variant,
    ])
  );

  if (options.length === 0) {
    const earlier = previousByCombination.get('[]') || previous[0];

    return [{
      id: earlier?.id,
      sku: earlier?.sku || `AYS-${slug.toUpperCase().slice(0, 40)}`,
      label: 'Default',
      price: priceText(earlier?.price),
      compare_at_price: priceText(earlier?.compare_at_price),
      stock: earlier?.stock ?? 0,
      is_default: true,
      selections: [],
    }];
  }

  let combinations = [[]];

  for (const option of options) {
    const values = option.values.map(value => value.trim()).filter(Boolean);

    if (!values.length) {
      return [];
    }

    combinations = combinations.flatMap(selections =>
      values.map(value => [
        ...selections,
        { option_code: option.code, value },
      ])
    );

    if (combinations.length > 100) {
      throw new Error('Maximum 100 variants. Reduce the option values.');
    }
  }

  const variants = combinations.map(selections => {
    const earlier = previousByCombination.get(variantCombinationKey(selections));
    const suffix = selections
      .map(selection => slugify(selection.value).toUpperCase().slice(0, 10))
      .join('-');

    return {
      id: earlier?.id,
      sku: earlier?.sku || `AYS-${slug.toUpperCase().slice(0, 25)}-${suffix}`.slice(0, 60),
      label: earlier?.label || variantLabel(selections),
      price: priceText(earlier?.price),
      compare_at_price: priceText(earlier?.compare_at_price),
      stock: earlier?.stock ?? 0,
      is_default: false,
      selections,
    };
  });

  const previousDefault = previous.find(variant =>
    variant.is_default === true ||
    variant.is_default === 1 ||
    variant.is_default === '1'
  );

  const oldDefaultIndex = previousDefault
    ? variants.findIndex(variant =>
        variantCombinationKey(variant.selections) ===
        variantCombinationKey(previousDefault.selections || [])
      )
    : -1;

  const defaultIndex = oldDefaultIndex >= 0 ? oldDefaultIndex : 0;

  return variants.map((variant, index) => ({
    ...variant,
    is_default: index === defaultIndex,
  }));
}

export function normalizeLoadedProduct(product) {
  const defaultIndex = Math.max(
    0,
    product.variants.findIndex(variant =>
      variant.is_default === true ||
      variant.is_default === 1 ||
      variant.is_default === '1'
    )
  );

  return {
    name: product.name,
    slug: product.slug,
    category_id: String(product.category_id),
    brand_id: product.brand_id ? String(product.brand_id) : '',
    product_type_id: product.product_type_id ? String(product.product_type_id) : '',
    short_desc: product.short_desc || '',
    description: product.description || '',
    is_featured: !!product.is_featured,
    status: product.status || 'active',
    specifications: Object.fromEntries(
      product.specifications.map(item => [item.attribute_id, item.value])
    ),
    options: product.options,
    variants: product.variants.map((variant, index) => ({
      ...variant,
      price: priceText(variant.price),
      compare_at_price: priceText(variant.compare_at_price),
      is_default: index === defaultIndex,
    })),
    images: product.images.map(image => ({
      url: image.url,
      alt: image.alt || '',
      variant_sku: image.variant_sku || '',
    })),
  };
}

export function toProductPayload(product, status) {
  return {
    name: product.name,
    slug: product.slug,
    category_id: Number(product.category_id),
    brand_id: product.brand_id ? Number(product.brand_id) : null,
    product_type_id: product.product_type_id
      ? Number(product.product_type_id)
      : null,
    short_desc: product.short_desc,
    description: product.description,
    is_featured: !!product.is_featured,
    status,
    specifications: Object.entries(product.specifications)
      .filter(([, value]) =>
        value !== '' &&
        value !== null &&
        value !== undefined &&
        (!Array.isArray(value) || value.length > 0)
      )
      .map(([attributeId, value]) => ({
        attribute_id: Number(attributeId),
        value,
      })),
    options: product.options,
    variants: product.variants.map(variant => ({
      id: variant.id || undefined,
      sku: variant.sku,
      label: variant.label,
      price: variant.price,
      compare_at_price: variant.compare_at_price || null,
      stock: Number(variant.stock),
      is_default: !!variant.is_default,
      selections: variant.selections,
    })),
    images: product.images
      .filter(image => image.url?.trim())
      .map(({ url, alt, variant_sku }) => ({
        url,
        alt,
        variant_sku: variant_sku || null,
      })),
  };
}
