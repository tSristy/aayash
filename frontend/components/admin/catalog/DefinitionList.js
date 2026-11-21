'use client';

import { useState } from 'react';
import Link from 'next/link';

import CatalogTableActions from './CatalogTableActions';
import useCatalogList from './useCatalogList';
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

const TYPE_OPTIONS = [
  { value: 'all', label: 'All data types' },
  ...['text', 'textarea', 'number', 'boolean', 'date', 'select', 'multiselect']
    .map(value => ({ value, label: value })),
];

export default function DefinitionList({ entity }) {
  const isType = entity === 'product-types';
  const title = isType ? 'Product Types' : 'Attributes';

  const [status, setStatus] = useState('all');
  const [dataType, setDataType] = useState('all');
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');

  const filters = { status };
  if (!isType) {
    filters.data_type = dataType;
  }

  const list = useCatalogList(entity, filters);

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
      setNotice('Status updated successfully.');
      list.refresh();
    } catch (error) {
      setActionError(error.message);
    }
  }

  function changeFilter(setter, value) {
    setter(value);
    list.setPage(1);
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl">{title}</h2>
          <p className="mt-1 text-sm text-taupe-600">
            {isType
              ? 'Define reusable product templates for every business category.'
              : 'Create reusable specification fields without editing database columns.'}
          </p>
        </div>

        <Link className={mainButton} href={`/admin/${entity}/new`}>
          + Add {isType ? 'Product Type' : 'Attribute'}
        </Link>
      </div>

      <Notice error={actionError || list.error} success={notice} />

      <section className={`${cardClass} !p-0 overflow-hidden`}>
        <div className="grid gap-4 border-b border-taupe-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg">
              All {title}{' '}
              <span className="text-sm font-normal text-taupe-600">({list.total})</span>
            </h3>

            <CatalogListSearch
              label={`Search ${title}`}
              value={list.search}
              onChange={list.changeSearch}
              placeholder="Search by name or code..."
            />
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <CatalogFilter
              label="Status"
              value={status}
              onChange={value => changeFilter(setStatus, value)}
              options={STATUS_OPTIONS}
            />
            {!isType && (
              <CatalogFilter
                label="Data type"
                value={dataType}
                onChange={value => changeFilter(setDataType, value)}
                options={TYPE_OPTIONS}
              />
            )}
          </div>
        </div>

        <div className="overflow-x-auto" aria-busy={list.loading}>
          <table className="w-full min-w-[650px] text-left text-sm">
            <thead className="bg-taupe-50">
              <tr>
                <th className="px-5 py-3">Name</th>
                <th className="px-4 py-3">{isType ? 'Description' : 'Data Type'}</th>
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
                    No matching records. Click Add to begin.
                  </td>
                </tr>
              ) : (
                list.items.map(row => (
                  <tr key={row.id} className="border-t border-taupe-100">
                    <td className="px-5 py-4">
                      <div className="font-medium">{row.name}</div>
                      <div className="text-xs text-taupe-600">{row.code}</div>
                    </td>
                    <td className="px-4 py-4 text-taupe-700">
                      {isType
                        ? row.description || '—'
                        : `${row.data_type}${row.unit ? ` · ${row.unit}` : ''}`}
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
