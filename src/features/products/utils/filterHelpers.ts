export const PUBLIC_PRODUCT_STATUSES = [
  'READY',
  'RESERVED',
  'IN_AUCTION',
  'SOLD',
] as const;

export type PublicProductStatus = (typeof PUBLIC_PRODUCT_STATUSES)[number];

export interface ParsedProductFilters {
  page: number;
  pageSize: number;
  categoryId?: string;
  status?: PublicProductStatus;
  search?: string;
}

export const DEFAULT_PAGE_SIZE = 12;

/**
 * Parses and sanitizes product list filters from URL query parameters.
 * Guarantees zero crash on malformed inputs and excludes internal statuses (e.g., DRAFT).
 */
export function parseProductFilters(
  searchParams: URLSearchParams
): ParsedProductFilters {
  // 1. Sanitize page: must be integer >= 1
  const rawPage = searchParams.get('page');
  const parsedPage = rawPage ? parseInt(rawPage, 10) : 1;
  const page = Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : 1;

  // 2. Sanitize pageSize: must be integer 1..100
  const rawPageSize = searchParams.get('pageSize');
  const parsedPageSize = rawPageSize ? parseInt(rawPageSize, 10) : DEFAULT_PAGE_SIZE;
  const pageSize =
    Number.isFinite(parsedPageSize) && parsedPageSize >= 1 && parsedPageSize <= 100
      ? parsedPageSize
      : DEFAULT_PAGE_SIZE;

  // 3. Sanitize categoryId
  const rawCategoryId = searchParams.get('categoryId');
  const categoryId =
    rawCategoryId && rawCategoryId.trim() ? rawCategoryId.trim() : undefined;

  // 4. Sanitize status: strictly allow only public statuses (no DRAFT)
  const rawStatus = searchParams.get('status')?.trim().toUpperCase();
  const status =
    rawStatus && (PUBLIC_PRODUCT_STATUSES as readonly string[]).includes(rawStatus)
      ? (rawStatus as PublicProductStatus)
      : undefined;

  // 5. Sanitize search keyword
  const rawSearch = searchParams.get('search');
  const search = rawSearch && rawSearch.trim() ? rawSearch.trim() : undefined;

  return {
    page,
    pageSize,
    categoryId,
    status,
    search,
  };
}

/**
 * Builds clean URLSearchParams from a filter object.
 * Omits undefined/empty values.
 */
export function buildProductFilterParams(
  filters: Partial<ParsedProductFilters>
): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.page && filters.page > 1) {
    params.set('page', String(filters.page));
  }
  if (filters.pageSize && filters.pageSize !== DEFAULT_PAGE_SIZE) {
    params.set('pageSize', String(filters.pageSize));
  }
  if (filters.categoryId) {
    params.set('categoryId', filters.categoryId);
  }
  if (filters.status) {
    params.set('status', filters.status);
  }
  if (filters.search && filters.search.trim()) {
    params.set('search', filters.search.trim());
  }

  return params;
}
