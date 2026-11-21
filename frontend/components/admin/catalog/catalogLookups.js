import { catalogRequest } from './catalogApi';

/**
 * Form dropdowns are distinct from the paginated catalog list screens.
 * Fetch in bounded pages so the first 10 catalog entries are not the only
 * choices available when editing or creating a product.
 */
export async function loadCatalogChoices(entity, signal) {
  const limit = 100;
  const MAX_PAGES = 30;
  const rows = [];

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const response = await catalogRequest(
      `/${entity}/lookup?page=${page}&limit=${limit}`,
      { signal }
    );

    rows.push(...response.items);

    if (page >= response.totalPages) {
      return rows;
    }
  }

  throw new Error(
    'Too many master records for this dropdown. Use a searchable selector or contact your administrator.'
  );
}
