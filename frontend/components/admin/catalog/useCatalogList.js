'use client';

import { useCallback, useEffect, useState } from 'react';

import { catalogRequest } from './catalogApi';

const DEFAULT_RESULT = {
  items: [],
  page: 1,
  limit: 10,
  total: 0,
  totalPages: 1,
};

/**
 * Central server-side list state. All list operations go through the backend.
 * AbortController prevents a slow old response from replacing a newer search.
 */
export default function useCatalogList(entity, filters = {}) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [result, setResult] = useState(DEFAULT_RESULT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  const filterKey = JSON.stringify(filters);

  const refresh = useCallback(() => {
    setRevision(previous => previous + 1);
  }, []);

  const changeSearch = useCallback(value => {
    setSearch(value);
    setPage(1);
  }, []);

  const changeLimit = useCallback(value => {
    setLimit(Number(value));
    setPage(1);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const parameters = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      q: search.trim(),
    });

    const parsedFilters = JSON.parse(filterKey);
    Object.entries(parsedFilters).forEach(([key, value]) => {
      if (value !== '' && value !== undefined && value !== null) {
        parameters.set(key, String(value));
      }
    });

    setLoading(true);

    const timeout = setTimeout(async () => {
      try {
        const data = await catalogRequest(`/${entity}?${parameters}`, {
          signal: controller.signal,
        });

        if (controller.signal.aborted) {
          return;
        }

        // A previously valid page can be empty after an archive or filter.
        if (page > 1 && data.totalPages < page) {
          setPage(data.totalPages);
          return;
        }

        setResult(data);
        setError('');
      } catch (requestError) {
        if (!controller.signal.aborted) {
          setError(requestError.message);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, search ? 300 : 0);

    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [entity, filterKey, search, page, limit, revision]);

  return {
    ...result,
    search,
    page,
    limit,
    loading,
    error,
    setPage,
    changeSearch,
    changeLimit,
    refresh,
  };
}
