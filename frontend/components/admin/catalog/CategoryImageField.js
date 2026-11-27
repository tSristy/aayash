'use client';

import { useRef, useState } from 'react';
import { inputClass, secondaryButton } from './catalogApi';
import { uploadProductImage } from './productImageUpload';

/** Category cover uses the same authenticated media uploader as products. */
export default function CategoryImageField({ value, onChange, disabled, label = 'Category Cover Photo', help, id = 'category-cover-file', fit = 'object-cover' }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function onFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    try {
      const image = await uploadProductImage(file);
      onChange(image.url);
    } catch (reason) {
      setError(reason.message || 'Unable to upload category cover.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="grid gap-3">
      <div>
        <p className="text-sm font-medium text-taupe-700">{label}</p>
        <p className="mt-1 text-xs text-taupe-600">
          {help || 'Upload a real JPG, PNG or WebP image (max 5 MB). The shop will automatically use a product photo when this is empty.'}
        </p>
      </div>
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex h-32 w-40 items-center justify-center overflow-hidden rounded-lg border border-taupe-200 bg-taupe-50">
          {value ? (
            <img src={value} alt="Category cover preview" className={`h-full w-full ${fit}`} />
          ) : (
            <span className="px-3 text-center text-xs text-taupe-600">No cover uploaded</span>
          )}
        </div>
        <div className="grid gap-2">
          <input
            ref={inputRef}
            id={id}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={disabled || uploading}
            onChange={onFile}
            className="sr-only"
          />
          <label
            htmlFor={id}
            className={`${secondaryButton} cursor-pointer ${disabled || uploading ? 'pointer-events-none opacity-50' : ''}`}
          >
            {uploading ? 'Uploading photo…' : 'Upload Photo'}
          </label>
          {value && (
            <button
              type="button"
              disabled={disabled || uploading}
              onClick={() => onChange('')}
              className="text-left text-xs text-red-700 hover:underline"
            >
              Remove image
            </button>
          )}
        </div>
      </div>
      <label className="grid gap-1.5 text-sm font-medium text-taupe-700">
        Or paste an image URL (optional)
        <input
          className={inputClass}
          value={value || ''}
          disabled={disabled || uploading}
          placeholder="https://... or /uploads/..."
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </div>
  );
}
