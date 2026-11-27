'use client';
import { useRef, useState } from 'react';
import { uploadProductImage } from '../catalog/productImageUpload';
import { Btn } from './kit';

/** Upload an image through the existing authenticated media endpoint and keep its URL. */
export default function ImageField({ label = 'Image', value, onChange, help }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function pick(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setError('');
    try { const img = await uploadProductImage(file); onChange(img.url); } catch (err) { setError(err.message || 'Upload failed.'); } finally { setBusy(false); if (ref.current) ref.current.value = ''; }
  }
  return (
    <div className="grid gap-1.5">
      <p className="text-sm font-medium text-taupe-700">{label}</p>
      <div className="flex items-center gap-3">
        <div className="grid h-20 w-28 shrink-0 place-items-center overflow-hidden rounded-xl border border-taupe-200 bg-taupe-50 text-xs text-taupe-600">
          {value ? <img src={value} alt="" className="h-full w-full object-cover" /> : 'No image'}
        </div>
        <div className="grid gap-2">
          <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} className="hidden" aria-label={`Choose ${label}`} />
          <div className="flex gap-2">
            <Btn size="sm" variant="outline" icon="upload" loading={busy} onClick={() => ref.current?.click()}>{value ? 'Replace' : 'Upload'}</Btn>
            {value && <Btn size="sm" variant="ghost" onClick={() => onChange('')}>Remove</Btn>}
          </div>
          <p className="text-xs text-taupe-600">{help || 'JPG, PNG or WebP, up to 5 MB.'}</p>
        </div>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
