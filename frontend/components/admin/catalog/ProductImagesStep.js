'use client';

import { useRef, useState } from 'react';

import { inputClass, labelClass, secondaryButton } from './catalogApi';
import { uploadProductImage } from './productImageUpload';

const MAX_PRODUCT_IMAGES = 15;

function suggestedAltText(filename) {
  return filename
    .replace(/\.[^.]+$/, '')
    .replace(/[-_]+/g, ' ')
    .trim()
    .slice(0, 200);
}

export default function ProductImagesStep({
  images,
  variants,
  onAppend,
  onPatch,
  onRemove,
  onMove,
  onUploadStateChange,
}) {
  const fileInputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [uploadError, setUploadError] = useState('');
  const remainingSlots = MAX_PRODUCT_IMAGES - images.length;

  async function addFiles(fileList) {
    const files = Array.from(fileList || []);

    if (!files.length) {
      return;
    }

    if (files.length > remainingSlots) {
      setUploadError(`Only ${remainingSlots} image slots remain (maximum 15).`);
      return;
    }

    setUploading(true);
    onUploadStateChange(true);
    setUploadError('');

    try {
      for (let index = 0; index < files.length; index++) {
        const file = files[index];
        setUploadProgress(`Uploading ${index + 1} of ${files.length}: ${file.name}`);

        const uploaded = await uploadProductImage(file);

        onAppend({
          url: uploaded.url,
          alt: suggestedAltText(file.name),
          variant_sku: '',
        });
      }

      setUploadProgress(`${files.length} image(s) uploaded. Save the product to keep them in its gallery.`);
    } catch (error) {
      setUploadError(error.message);
      setUploadProgress('Successfully uploaded images have been added below.');
    } finally {
      setUploading(false);
      onUploadStateChange(false);

      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    setDragging(false);

    if (!uploading) {
      addFiles(event.dataTransfer.files);
    }
  }

  return (
    <div className="grid gap-5">
      <div>
        <h3 className="text-lg">Product Image Gallery</h3>
        <p className="mt-1 text-sm text-taupe-600">
          Upload images from your computer, preview and arrange them here.
          The first image becomes the main product image.
        </p>
      </div>

      <div
        className={`rounded-xl border-2 border-dashed p-7 text-center transition-colors ${
          dragging ? 'border-primary bg-primary/10' : 'border-taupe-200 bg-taupe-50'
        }`}
        onDragOver={event => {
          event.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          id="product-image-files"
          className="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          disabled={uploading || remainingSlots === 0}
          onChange={event => addFiles(event.target.files)}
        />

        <div className="mb-3 text-3xl" aria-hidden="true">📷</div>
        <p className="font-medium text-taupe-900">Drag & drop images here</p>
        <p className="mt-1 text-xs text-taupe-600">
          JPG, PNG or WebP · Up to 5 MB per image · {remainingSlots} slots available
        </p>

        <label
          htmlFor="product-image-files"
          className={`mt-4 inline-flex cursor-pointer items-center justify-center rounded-xl bg-taupe-900 px-5 py-2.5 text-sm font-bold text-white ${
            uploading || remainingSlots === 0 ? 'pointer-events-none opacity-50' : 'hover:bg-taupe-800'
          }`}
        >
          {uploading ? 'Uploading…' : 'Choose Images'}
        </label>
      </div>

      {uploadProgress && (
        <p role="status" className="text-sm text-taupe-600">{uploadProgress}</p>
      )}
      {uploadError && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
          {uploadError}
        </p>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="font-medium">Gallery ({images.length})</h4>
        <button
          type="button"
          className={secondaryButton}
          disabled={uploading || remainingSlots === 0}
          onClick={() => onAppend({ url: '', alt: '', variant_sku: '' })}
        >
          + Add Image URL
        </button>
      </div>

      {images.length === 0 && (
        <p className="rounded-xl border border-taupe-200 p-5 text-sm text-taupe-600">
          No images added yet. Upload images or add an HTTPS image URL.
        </p>
      )}

      <div className="grid gap-4">
        {images.map((image, index) => (
          <section
            key={index}
            className="grid gap-4 rounded-xl border border-taupe-200 p-4 md:grid-cols-[130px_minmax(0,1fr)]"
          >
            <div className="flex flex-col gap-2">
              <div className="grid h-32 place-items-center overflow-hidden rounded-lg bg-taupe-50">
                {image.url ? (
                  <img
                    src={image.url}
                    alt={image.alt || `Product image ${index + 1}`}
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <span className="text-xs text-taupe-600">No image yet</span>
                )}
              </div>
              {index === 0 && (
                <span className="rounded-lg bg-green-50 px-2 py-1 text-center text-xs text-green-700">
                  Main Image
                </span>
              )}
            </div>

            <div className="grid min-w-0 gap-3">
              <label className={labelClass}>
                Image URL
                <input
                  className={inputClass}
                  value={image.url}
                  placeholder="https://... or /uploads/..."
                  onChange={event => onPatch(index, 'url', event.target.value)}
                />
              </label>

              <label className={labelClass}>
                Alt Text
                <input
                  className={inputClass}
                  maxLength={200}
                  value={image.alt || ''}
                  placeholder="Describe the image for accessibility"
                  onChange={event => onPatch(index, 'alt', event.target.value)}
                />
              </label>

              <label className={labelClass}>
                Variant SKU (optional)
                <select
                  className={inputClass}
                  value={image.variant_sku || ''}
                  onChange={event => onPatch(index, 'variant_sku', event.target.value)}
                >
                  <option value="">All variants</option>
                  {variants.map(variant => (
                    <option key={variant.sku} value={variant.sku}>
                      {variant.sku}
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={secondaryButton}
                  disabled={index === 0}
                  onClick={() => onMove(index, 0)}
                >
                  Make Main
                </button>
                <button
                  type="button"
                  className={secondaryButton}
                  aria-label={`Move image ${index + 1} up`}
                  disabled={index === 0}
                  onClick={() => onMove(index, index - 1)}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={secondaryButton}
                  aria-label={`Move image ${index + 1} down`}
                  disabled={index === images.length - 1}
                  onClick={() => onMove(index, index + 1)}
                >
                  ↓
                </button>
                <button
                  type="button"
                  className="rounded-lg px-3 py-2 text-sm text-red-700 hover:bg-red-50"
                  onClick={() => onRemove(index)}
                >
                  Remove
                </button>
              </div>
            </div>
          </section>
        ))}
      </div>

      <p className="text-xs leading-relaxed text-taupe-600">
        Changes to image order, descriptions and SKU association are saved when
        you Save Draft or Publish. Removing an image from this form does not
        immediately delete the stored file. Uploading a new image does not
        automatically save the product.
      </p>
    </div>
  );
}
