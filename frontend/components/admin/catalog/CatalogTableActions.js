'use client';

import Link from 'next/link';
import Icon from '../Icon';

const actionClass = [
  'inline-flex h-9 w-9 items-center justify-center rounded-lg',
  'border border-taupe-200 bg-white text-taupe-700',
  'transition-colors hover:border-primary hover:bg-primary/10',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary',
].join(' ');

/**
 * Consistent, accessible icon-only actions for every catalog list table.
 * Visible labels are intentionally omitted; titles and aria-labels remain.
 */
export default function CatalogTableActions({
  name,
  viewHref,
  editHref,
  archived = false,
  onToggle,
}) {
  const verb = archived ? 'Activate' : 'Archive';

  return (
    <div className="flex items-center justify-end gap-2">
      <Link
        href={viewHref}
        className={actionClass}
        aria-label={`View ${name}`}
        title={`View ${name}`}
      >
        <Icon name="eye" size={17} />
      </Link>

      <Link
        href={editHref}
        className={actionClass}
        aria-label={`Edit ${name}`}
        title={`Edit ${name}`}
      >
        <Icon name="edit" size={17} />
      </Link>

      {onToggle && (
        <button
          type="button"
          className={actionClass}
          onClick={onToggle}
          aria-label={`${verb} ${name}`}
          title={`${verb} ${name}`}
        >
          <Icon name={archived ? 'restore' : 'archive'} size={17} />
        </button>
      )}
    </div>
  );
}
