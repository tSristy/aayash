'use client';

import { loadCatalogChoices } from './catalogLookups';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

import {
  catalogRequest,
  Notice,
  cardClass,
  mainButton,
  secondaryButton,
  fieldCode,
} from './catalogApi';

import ProductBasicStep from './ProductBasicStep';
import ProductSpecsStep from './ProductSpecsStep';
import ProductImagesStep from './ProductImagesStep';
import ProductVariantsStep from './ProductVariantsStep';
import ProductReviewStep from './ProductReviewStep';

import {
  PRODUCT_STEPS,
  blankProduct,
  normalizeLoadedProduct,
  generateVariants,
  toProductPayload,
} from './productWizardUtils';

export default function ProductWizard({ id }) {
  const router = useRouter();
  const editing = Boolean(id);

  const [step, setStep] = useState(0);
  const [product, setProduct] = useState(blankProduct);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [productTypes, setProductTypes] = useState([]);
  const [typeDetail, setTypeDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [slugTouched, setSlugTouched] = useState(editing);
  const [optionDirty, setOptionDirty] = useState(false);

  function change(key, value) {
    setProduct(previous => ({ ...previous, [key]: value }));
  }

  useEffect(() => {
    let mounted = true;

    async function loadProduct() {
      try {
        const [categoryRows, brandRows, typeRows, savedProduct] = await Promise.all([
          loadCatalogChoices('categories'),
          loadCatalogChoices('brands'),
          loadCatalogChoices('product-types'),
          editing ? catalogRequest(`/products/${id}`) : Promise.resolve(null),
        ]);

        if (!mounted) {
          return;
        }

        setCategories(categoryRows);
        setBrands(brandRows);
        setProductTypes(typeRows);

        if (savedProduct) {
          setProduct(normalizeLoadedProduct(savedProduct));
        }
      } catch (requestError) {
        if (mounted) {
          setError(requestError.message);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadProduct();
    return () => { mounted = false; };
  }, [id, editing]);

  useEffect(() => {
    let mounted = true;
    const productTypeId = product.product_type_id;

    setTypeDetail(null);

    if (!productTypeId) {
      return undefined;
    }

    catalogRequest(`/product-types/${productTypeId}`)
      .then(result => {
        if (mounted) {
          setTypeDetail(result);
        }
      })
      .catch(requestError => {
        if (mounted) {
          setError(requestError.message);
        }
      });

    return () => { mounted = false; };
  }, [product.product_type_id]);

  const assignments = useMemo(() => {
    return (typeDetail?.attributeAssignments || [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order);
  }, [typeDetail]);

  const selectedType = productTypes.find(type =>
    String(type.id) === String(product.product_type_id)
  );

  function selectProductType(value) {
    const isChangingExistingType =
      editing &&
      product.product_type_id &&
      String(value) !== String(product.product_type_id);

    if (
      isChangingExistingType &&
      !window.confirm('Changing Product Type clears existing specifications. Continue?')
    ) {
      return;
    }

    setProduct(previous => ({
      ...previous,
      product_type_id: value,
      specifications: {},
    }));
  }

  function changeSpecification(attributeId, value) {
    setProduct(previous => ({
      ...previous,
      specifications: {
        ...previous.specifications,
        [attributeId]: value,
      },
    }));
  }

  function addImage(image) {
    setProduct(previous => ({
      ...previous,
      images: [...previous.images, image],
    }));
  }

  function patchImage(index, key, value) {
    setProduct(previous => ({
      ...previous,
      images: previous.images.map((image, imageIndex) =>
        imageIndex === index ? { ...image, [key]: value } : image
      ),
    }));
  }

  function removeImage(index) {
    setProduct(previous => ({
      ...previous,
      images: previous.images.filter((_, imageIndex) => imageIndex !== index),
    }));
  }

  function moveImage(fromIndex, toIndex) {
    setProduct(previous => {
      const images = [...previous.images];
      const [image] = images.splice(fromIndex, 1);
      images.splice(toIndex, 0, image);

      return { ...previous, images };
    });
  }

  function addOption() {
    if (product.options.length >= 3) {
      setError('Maximum 3 options allowed.');
      return;
    }

    setProduct(previous => ({
      ...previous,
      options: [...previous.options, { code: '', name: '', values: [] }],
    }));
    setOptionDirty(true);
  }

  function editOption(index, patch) {
    setProduct(previous => ({
      ...previous,
      options: previous.options.map((option, optionIndex) => {
        if (optionIndex !== index) {
          return option;
        }

        const updated = { ...option, ...patch };

        if (patch.name !== undefined) {
          updated.code = fieldCode(patch.name);
        }

        return updated;
      }),
    }));
    setOptionDirty(true);
  }

  function removeOption(index) {
    setProduct(previous => ({
      ...previous,
      options: previous.options.filter((_, optionIndex) => optionIndex !== index),
    }));
    setOptionDirty(true);
  }

  function regenerateVariants() {
    setError('');

    try {
      const options = product.options.map(option => ({
        code: fieldCode(option.code || option.name),
        name: option.name,
        values: option.values.map(value => value.trim()).filter(Boolean),
      }));

      if (options.some(option => !option.code || !option.name)) {
        throw new Error('Give each option a name.');
      }

      const variants = generateVariants(
        options,
        product.variants,
        product.slug || 'product'
      );

      setProduct(previous => ({ ...previous, options, variants }));
      setOptionDirty(false);
    } catch (generationError) {
      setError(generationError.message);
    }
  }

  function patchVariant(index, key, value) {
    setProduct(previous => ({
      ...previous,
      variants: previous.variants.map((variant, variantIndex) =>
        variantIndex === index ? { ...variant, [key]: value } : variant
      ),
    }));
  }

  function setDefaultVariant(index) {
    setError('');
    setProduct(previous => ({
      ...previous,
      variants: previous.variants.map((variant, variantIndex) => ({
        ...variant,
        is_default: variantIndex === index,
      })),
    }));
  }

  function removeVariant(index) {
    setProduct(previous => {
      const variants = previous.variants.filter((_, variantIndex) =>
        variantIndex !== index
      );
      const oldDefaultExists = variants.some(variant => variant.is_default);

      return {
        ...previous,
        variants: variants.map((variant, variantIndex) => ({
          ...variant,
          is_default: oldDefaultExists
            ? !!variant.is_default
            : variantIndex === 0,
        })),
      };
    });
  }

  async function submit(status) {
    setError('');

    if (uploading) {
      setStep(2);
      setError('Finish uploading images before saving the product.');
      return;
    }

    if (optionDirty) {
      setStep(3);
      setError('Option values changed. Generate / Update Variants before saving.');
      return;
    }

    setSaving(true);

    try {
      const payload = toProductPayload(product, status);
      const result = await catalogRequest(
        editing ? `/products/${id}` : '/products',
        {
          method: editing ? 'PUT' : 'POST',
          body: JSON.stringify(payload),
        }
      );

      router.push(`/admin/products/${result.id}`);
      router.refresh();
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  function renderCurrentStep() {
    switch (step) {
      case 0:
        return (
          <ProductBasicStep
            product={product}
            categories={categories}
            brands={brands}
            productTypes={productTypes}
            slugTouched={slugTouched}
            onSlugTouched={() => setSlugTouched(true)}
            onChange={change}
            onSelectType={selectProductType}
          />
        );

      case 1:
        return (
          <ProductSpecsStep
            selectedType={selectedType}
            assignments={assignments}
            specifications={product.specifications}
            onChange={changeSpecification}
          />
        );

      case 2:
        return (
          <ProductImagesStep
            images={product.images}
            variants={product.variants}
            onAppend={addImage}
            onPatch={patchImage}
            onRemove={removeImage}
            onMove={moveImage}
            onUploadStateChange={setUploading}
          />
        );

      case 3:
        return (
          <ProductVariantsStep
            options={product.options}
            variants={product.variants}
            optionDirty={optionDirty}
            onAddOption={addOption}
            onEditOption={editOption}
            onRemoveOption={removeOption}
            onGenerate={regenerateVariants}
            onVariantChange={patchVariant}
            onSetDefault={setDefaultVariant}
            onRemoveVariant={removeVariant}
          />
        );

      default:
        return (
          <ProductReviewStep
            product={product}
            categories={categories}
            brands={brands}
            selectedType={selectedType}
            assignments={assignments}
            optionDirty={optionDirty}
            onEditStep={setStep}
          />
        );
    }
  }

  return (
    <div className="grid gap-5">
      <div>
        <Link href="/admin/products" className="text-sm text-primary-deep hover:underline">
          ← Back to Products
        </Link>
        <h2 className="mt-2 text-xl">
          {editing ? 'Edit Product' : 'Create Product'}
        </h2>
        <p className="mt-1 text-sm text-taupe-600">
          Step-by-step product setup using the existing Ayashmart Admin design.
        </p>
      </div>

      <Notice error={error} />

      {loading ? (
        <p>Loading...</p>
      ) : (
        <>
          <nav className="flex flex-wrap gap-2" aria-label="Product form steps">
            {PRODUCT_STEPS.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => setStep(index)}
                aria-current={step === index ? 'step' : undefined}
                className={`rounded-xl border px-3 py-2 text-xs font-medium ${
                  step === index
                    ? 'border-primary bg-primary/15 text-taupe-900'
                    : 'border-taupe-200 bg-white text-taupe-700 hover:bg-taupe-50'
                }`}
              >
                {index + 1}. {label}
              </button>
            ))}
          </nav>

          <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
            <section className={cardClass}>
              {renderCurrentStep()}
            </section>

            <aside className={`${cardClass} grid gap-3`}>
              <h3 className="text-lg">Product Status</h3>
              <p className="text-sm text-taupe-700">
                Current: <strong>{product.status}</strong>
              </p>
              <p className="text-xs leading-relaxed text-taupe-600">
                Saving or publishing is always validated on the backend.
                An existing order&apos;s SKU cannot be silently deleted.
              </p>

              <button
                className={secondaryButton}
                disabled={saving || uploading}
                type="button"
                onClick={() => submit('draft')}
              >
                Save Draft
              </button>

              <button
                className={mainButton}
                disabled={saving || uploading}
                type="button"
                onClick={() => submit('active')}
              >
                {saving ? 'Saving...' : 'Publish Product'}
              </button>

              <Link className={secondaryButton} href="/admin/products">
                Cancel
              </Link>
            </aside>
          </div>

          <div className="flex justify-between">
            <button
              className={secondaryButton}
              type="button"
              disabled={step === 0}
              onClick={() => setStep(current => Math.max(0, current - 1))}
            >
              ← Previous
            </button>

            <button
              className={mainButton}
              type="button"
              disabled={step === PRODUCT_STEPS.length - 1 || uploading}
              onClick={() => setStep(current =>
                Math.min(PRODUCT_STEPS.length - 1, current + 1)
              )}
            >
              Next Step →
            </button>
          </div>
        </>
      )}
    </div>
  );
}
