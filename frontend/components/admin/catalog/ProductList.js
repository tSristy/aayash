'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

import CatalogTableActions from './CatalogTableActions';
import useCatalogList from './useCatalogList';
import {
  CatalogFilter,
  CatalogListSearch,
  CatalogLoadingRows,
  CatalogPagination,
} from './CatalogListControls';
import { loadCatalogChoices } from './catalogLookups';
import {
  catalogRequest,
  Notice,
  mainButton,
  cardClass,
} from './catalogApi';

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
];

const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'name_asc', label: 'Name A–Z' },
  { value: 'name_desc', label: 'Name Z–A' },
];

function selectOptions(items, label) {
  return [
    { value: 'all', label },
    ...items.map(item => ({ value: String(item.id), label: item.name })),
  ];
}

export default function ProductList() {
  const [status, setStatus] = useState('all');
  const [categoryId, setCategoryId] = useState('all');
  const [brandId, setBrandId] = useState('all');
  const [productTypeId, setProductTypeId] = useState('all');
  const [sort, setSort] = useState('newest');
  const [options, setOptions] = useState({
    categories: [],
    brands: [],
    types: [],
  });
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');

  const list = useCatalogList('products', {
    status,
    category_id: categoryId,
    brand_id: brandId,
    product_type_id: productTypeId,
    sort,
  });

  useEffect(() => {
    const controller = new AbortController();

    async function loadFilters() {
      try {
        const [categories, brands, types] = await Promise.all([
          loadCatalogChoices('categories', controller.signal),
          loadCatalogChoices('brands', controller.signal),
          loadCatalogChoices('product-types', controller.signal),
        ]);

        if (!controller.signal.aborted) {
          setOptions({ categories, brands, types });
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          setActionError(error.message);
        }
      }
    }

    loadFilters();
    return () => controller.abort();
  }, []);

  function changeFilter(setter, value) {
    setter(value);
    list.setPage(1);
  }

  async function toggleArchive(product) {
    const wasArchived = product.status === 'archived';
    const nextStatus = wasArchived ? 'draft' : 'archived';
    const action = wasArchived ? 'Restore to Draft' : 'Archive';

    if (!window.confirm(`${action} ${product.name}? Existing orders will remain intact.`)) {
      return;
    }

    try {
      await catalogRequest(`/products/${product.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: nextStatus }),
      });

      setNotice(wasArchived ? 'Product restored as Draft.' : 'Product archived.');
      setActionError('');
      list.refresh();
    } catch (error) {
      setActionError(error.message);
    }
  }

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl">Products</h2>
          <p className="mt-1 text-sm text-taupe-600">
            Create, manage and publish products across all categories.
          </p>
        </div>

        <Link className={mainButton} href="/admin/products/new">
          + Add Product
        </Link>
      </div>

      <Notice error={actionError || list.error} success={notice} />

      <section className={`${cardClass} !p-0 overflow-hidden`}>
        <div className="grid gap-4 border-b border-taupe-200 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-lg">
              Product Catalog{' '}
              <span className="text-sm font-normal text-taupe-600">({list.total})</span>
            </h3>

            <CatalogListSearch
              label="Search products"
              value={list.search}
              onChange={list.changeSearch}
              placeholder="Search product name, slug, description..."
            />
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <CatalogFilter
              label="Status"
              value={status}
              onChange={value => changeFilter(setStatus, value)}
              options={STATUS_OPTIONS}
            />
            <CatalogFilter
              label="Category"
              value={categoryId}
              onChange={value => changeFilter(setCategoryId, value)}
              options={selectOptions(options.categories, 'All categories')}
            />
            <CatalogFilter
              label="Brand"
              value={brandId}
              onChange={value => changeFilter(setBrandId, value)}
              options={selectOptions(options.brands, 'All brands')}
            />
            <CatalogFilter
              label="Product Type"
              value={productTypeId}
              onChange={value => changeFilter(setProductTypeId, value)}
              options={selectOptions(options.types, 'All types')}
            />
            <CatalogFilter
              label="Sort by"
              value={sort}
              onChange={value => changeFilter(setSort, value)}
              options={SORT_OPTIONS}
            />
          </div>
        </div>

        <div className="overflow-x-auto" aria-busy={list.loading}>
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead className="bg-taupe-50">
              <tr>
                <th className="px-5 py-3">Product</th>
                <th className="px-3 py-3">Category</th>
                <th className="px-3 py-3">Type</th>
                <th className="px-3 py-3">Price from</th>
                <th className="px-3 py-3">Stock</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.loading ? (
                <CatalogLoadingRows colSpan={7} />
              ) : list.items.length === 0 ? (
                <tr>
                  <td className="p-6 text-taupe-600" colSpan={7}>
                    No products match the current filters.
                  </td>
                </tr>
              ) : (
                list.items.map(product => (
                  <tr key={product.id} className="border-t border-taupe-100">
                    <td className="px-5 py-3">
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-taupe-600">
                        {product.slug} · {product.variant_count} SKU
                      </div>
                    </td>
                    <td className="px-3 py-3">{product.category?.name || '—'}</td>
                    <td className="px-3 py-3">{product.productType?.name || 'Legacy'}</td>
                    <td className="px-3 py-3">
                      {product.starting_price == null
                        ? '—'
                        : `৳${Number(product.starting_price).toLocaleString('en-BD')}`}
                    </td>
                    <td className="px-3 py-3">{product.stock_total}</td>
                    <td className="px-3 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs ${
                        product.status === 'active'
                          ? 'bg-green-50 text-green-700'
                          : 'bg-taupe-100 text-taupe-700'
                      }`}>
                        {product.status || 'draft'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-right">
                      <CatalogTableActions
                        name={product.name}
                        viewHref={`/admin/products/${product.id}`}
                        editHref={`/admin/products/${product.id}/edit`}
                        archived={product.status === 'archived'}
                        onToggle={() => toggleArchive(product)}
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
