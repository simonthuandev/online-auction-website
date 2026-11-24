import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { ApiError } from '@/api/client';
import {
  productApi,
  type ProductListParams,
  type CategoryListParams,
} from '@/api/product.api';
import type { Product, ProductPage, CategoryPage } from '@/contracts/api.generated';

export const PRODUCT_QUERY_KEYS = {
  all: ['products'] as const,
  list: (params?: ProductListParams) => ['products', 'list', params] as const,
  detail: (id: string) => ['products', 'detail', id] as const,
  categories: (params?: CategoryListParams) => ['categories', 'list', params] as const,
};

/**
 * Hook to retrieve paginated public products.
 * Uses keepPreviousData for smooth pagination transitions.
 */
export function useProducts(filters: ProductListParams) {
  return useQuery<ProductPage, Error>({
    queryKey: PRODUCT_QUERY_KEYS.list(filters),
    queryFn: () => productApi.getProducts(filters),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 30, // 30s
  });
}

/**
 * Hook to retrieve a single product by ID.
 */
export function useProduct(id?: string) {
  return useQuery<Product, Error>({
    queryKey: PRODUCT_QUERY_KEYS.detail(id || ''),
    queryFn: () => {
      if (!id) throw new Error('Mã sản phẩm không hợp lệ');
      return productApi.getProduct(id);
    },
    enabled: Boolean(id),
    staleTime: 1000 * 60, // 1 min
    retry: (failureCount, error: Error) => {
      // Don't retry on 404
      const status =
        error instanceof ApiError
          ? error.statusCode
          : 'statusCode' in error
            ? (error as { statusCode?: number }).statusCode
            : 'response' in error
              ? (error as { response?: { status?: number } }).response?.status
              : undefined;

      if (status === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

/**
 * Hook to retrieve category list for filter dropdowns.
 */
export function useCategories(params?: CategoryListParams) {
  return useQuery<CategoryPage, Error>({
    queryKey: PRODUCT_QUERY_KEYS.categories(params),
    queryFn: () => productApi.getCategories(params),
    staleTime: 1000 * 60 * 10, // 10 mins cache for categories
  });
}
