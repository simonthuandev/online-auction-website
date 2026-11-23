import { apiClient } from './client.ts';
import type {
  Product,
  Category,
  ProductPage,
  CategoryPage,
  ProductStatus,
} from '../contracts/api.generated.ts';

export interface ProductListParams {
  page?: number;
  pageSize?: number;
  categoryId?: string;
  status?: ProductStatus | string;
  search?: string;
}

export interface CategoryListParams {
  page?: number;
  pageSize?: number;
  search?: string;
}

export const productApi = {
  /**
   * Fetch paginated list of categories.
   * Calls GET /api/categories.
   */
  async getCategories(params?: CategoryListParams): Promise<CategoryPage> {
    const res = await apiClient.get<CategoryPage>('/api/categories', {
      params,
    });
    return res.data;
  },

  /**
   * Fetch single category by ID.
   * Calls GET /api/categories/{id}.
   */
  async getCategory(id: string): Promise<Category> {
    const res = await apiClient.get<Category>(`/api/categories/${id}`);
    return res.data;
  },

  /**
   * Fetch paginated list of public products with optional filtering.
   * Calls GET /api/products.
   */
  async getProducts(params?: ProductListParams): Promise<ProductPage> {
    const res = await apiClient.get<ProductPage>('/api/products', {
      params,
    });
    return res.data;
  },

  /**
   * Fetch detailed information of a single product.
   * Calls GET /api/products/{id}.
   */
  async getProduct(id: string): Promise<Product> {
    const res = await apiClient.get<Product>(`/api/products/${id}`);
    return res.data;
  },
};

