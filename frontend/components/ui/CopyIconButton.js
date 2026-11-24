'use client';

import { useState } from 'react';

/** Copy control shared by the admin and storefront. Only an icon is visible. */
export default function CopyIconButton({
  value,
  label = 'Copy to clipboard',
  className = '',
  onResult,
}) {
  const [copied, setCopied] = useState(false);

  async function copyValue() {
    try {
      await navigator.clipboard.writeText(String(value || ''));
      setCopied(true);
      onResult?.(true);
    } catch {
      onResult?.(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copyValue}
      title={copied ? 'Copied' : label}
      aria-label={copied ? 'Copied to clipboard' : label}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-[#E2D9CE] transition-colors hover:bg-black/5 ${className}`}
    >
      {copied ? (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M5 12l4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
          <rect x="8" y="8" width="12" height="12" rx="2" />
          <path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />
        </svg>
      )}
    </button>
  );
}
