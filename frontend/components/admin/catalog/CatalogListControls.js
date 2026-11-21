'use client';

import { inputClass, secondaryButton } from './catalogApi';

const PAGE_SIZES = [10, 20, 50, 100];

export function CatalogListSearch({ label, value, onChange, placeholder }) {
  return (
    <label className="block w-full sm:w-72">
      <span className="sr-only">{label}</span>
      <input
        type="search"
        aria-label={label}
        className={inputClass}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder || 'Search records...'}
      />
    </label>
  );
}

export function CatalogFilter({ label, value, onChange, options }) {
  return (
    <label className="flex min-w-[130px] flex-col gap-1 text-xs text-taupe-600">
      <span>{label}</span>
      <select
        value={value}
        onChange={event => onChange(event.target.value)}
        className={inputClass}
        aria-label={label}
      >
        {options.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function CatalogLoadingRows({ colSpan, count = 5 }) {
  return Array.from({ length: count }, (_, index) => (
    <tr className="border-t border-taupe-100" key={`skeleton-${index}`}>
      <td colSpan={colSpan} className="px-5 py-4">
        <div className="flex animate-pulse items-center gap-4" aria-hidden="true">
          <div className="h-9 w-9 rounded-lg bg-taupe-100" />
          <div className="grid flex-1 gap-2">
            <div className="h-3 w-1/3 rounded-full bg-taupe-200" />
            <div className="h-2 w-1/2 rounded-full bg-taupe-100" />
          </div>
        </div>
      </td>
    </tr>
  ));
}

export function CatalogPagination({ list }) {
  const {
    page,
    limit,
    total,
    totalPages,
    loading,
    setPage,
    changeLimit,
  } = list;

  const firstRecord = total ? (page - 1) * limit + 1 : 0;
  const lastRecord = total ? Math.min(page * limit, total) : 0;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-taupe-200 px-5 py-4">
      <p className="text-xs text-taupe-600" aria-live="polite">
        Showing {firstRecord}–{lastRecord} of {total} records
        <span className="ml-2">· Page {page} of {totalPages}</span>
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-2 text-xs text-taupe-600">
          Rows
          <select
            aria-label="Rows per page"
            className="rounded-xl border border-taupe-200 bg-white px-3 py-2 text-sm text-taupe-900"
            value={limit}
            onChange={event => changeLimit(event.target.value)}
            disabled={loading}
          >
            {PAGE_SIZES.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
        </label>

        <button
          type="button"
          className={secondaryButton}
          disabled={page <= 1 || loading}
          onClick={() => setPage(1)}
        >
          First
        </button>
        <button
          type="button"
          className={secondaryButton}
          disabled={page <= 1 || loading}
          onClick={() => setPage(current => Math.max(1, current - 1))}
        >
          Previous
        </button>
        <button
          type="button"
          className={secondaryButton}
          disabled={page >= totalPages || loading}
          onClick={() => setPage(current => current + 1)}
        >
          Next
        </button>
        <button
          type="button"
          className={secondaryButton}
          disabled={page >= totalPages || loading}
          onClick={() => setPage(totalPages)}
        >
          Last
        </button>
      </div>
    </div>
  );
}
