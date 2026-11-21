'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import CatalogTableActions from './CatalogTableActions';
import useCatalogList from './useCatalogList';
import { loadCatalogChoices } from './catalogLookups';
import {
  CatalogFilter,
  CatalogListSearch,
  CatalogLoadingRows,
  CatalogPagination,
} from './CatalogListControls';
import { catalogRequest, Notice, mainButton, cardClass } from './catalogApi';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'archived', label: 'Archived' },
];

export default function CatalogMasterManager({ entity }) {
  const isCategory = entity === 'categories';
  const title = isCategory ? 'Categories' : 'Brands';

  const [status, setStatus] = useState('all');
  const [parentFilter, setParentFilter] = useState('all');
  const [parentOptions, setParentOptions] = useState([]);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');

  const filters = { status };
  if (isCategory) {
    filters.parent_id = parentFilter;
  }

  const list = useCatalogList(entity, filters);

  useEffect(() => {
    if (!isCategory) {
      return undefined;
    }

    const controller = new AbortController();

    loadCatalogChoices('categories', controller.signal)
      .then(rows => {
        if (!controller.signal.aborted) {
          setParentOptions(rows);
        }
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          setActionError(error.message);
        }
      });

    return () => controller.abort();
  }, [isCategory]);

  async function toggleStatus(row) {
    const action = row.is_active ? 'Archive' : 'Activate';

    if (!window.confirm(`${action} ${row.name}?`)) {
      return;
    }

    try {
      setActionError('');
      await catalogRequest(`/${entity}/${row.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !row.is_active }),
      });

      setNotice(`${row.name} updated successfully.`);
      list.refresh();
    } catch (error) {
      setActionError(error.message);
    }
  }

  function changeStatus(value) {
    setStatus(value);
    list.setPage(1);
  }

  function changeParent(value) {
    setParentFilter(value);
    list.setPage(1);
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl text-taupe-900">{title} Management</h2>
          <p className="mt-1 text-sm text-taupe-600">
            Organize your catalog and maintain product relationships.
          </p>
        </div>

        <Link className={mainButton} href={`/admin/${entity}/new`}>
          + Add {isCategory ? 'Category' : 'Brand'}
        </Link>
      </div>

      <Notice error={actionError || list.error} success={notice} />

      <section className={`${cardClass} !p-0 overflow-hidden`}>
        <div className="grid gap-4 border-b border-taupe-200 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg">
              All {title}{' '}
              <span className="text-sm font-normal text-taupe-600">({list.total})</span>
            </h3>

            <CatalogListSearch
              label={`Search ${title.toLowerCase()}`}
              value={list.search}
              onChange={list.changeSearch}
              placeholder={`Search ${title.toLowerCase()} by name or slug...`}
            />
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <CatalogFilter
              label="Status"
              value={status}
              onChange={changeStatus}
              options={STATUS_OPTIONS}
            />
            {isCategory && (
              <CatalogFilter
                label="Hierarchy"
                value={parentFilter}
                onChange={changeParent}
                options={[
                  { value: 'all', label: 'All categories' },
                  { value: 'root', label: 'Top-level only' },
                  ...parentOptions.map(parent => ({
                    value: String(parent.id),
                    label: `Under ${parent.name}`,
                  })),
                ]}
              />
            )}
          </div>
        </div>

        <div className="overflow-x-auto" aria-busy={list.loading}>
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="bg-taupe-50 text-taupe-700">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-4 py-3">{isCategory ? 'Parent' : 'Slug'}</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.loading ? (
                <CatalogLoadingRows colSpan={4} />
              ) : list.items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-5 py-8 text-taupe-600">
                    No matching records.
                  </td>
                </tr>
              ) : (
                list.items.map(row => (
                  <tr key={row.id} className="border-t border-taupe-100">
                    <td className="px-5 py-4">
                      <div className="font-medium">{row.emoji || ''} {row.name}</div>
                      <div className="text-xs text-taupe-600">{row.slug}</div>
                    </td>
                    <td className="px-4 py-4 text-taupe-700">
                      {isCategory ? row.parent?.name || 'Top-level' : row.slug}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`rounded-full px-2.5 py-1 text-xs ${
                        row.is_active
                          ? 'bg-green-50 text-green-700'
                          : 'bg-taupe-100 text-taupe-700'
                      }`}>
                        {row.is_active ? 'Active' : 'Archived'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-4 text-right">
                      <CatalogTableActions
                        name={row.name}
                        viewHref={`/admin/${entity}/${row.id}`}
                        editHref={`/admin/${entity}/${row.id}/edit`}
                        archived={!row.is_active}
                        onToggle={() => toggleStatus(row)}
                      />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <CatalogPagination list={list} />
      </section>
    </div>
  );
}
