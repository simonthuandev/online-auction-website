import { apiClient } from './client.ts';
import type {
  Product,
  Category,
  ProductPage,
  CategoryPage,
  ProductStatus,
  ProductCondition,
} from '../contracts/api.generated.ts';

export interface ProductImageInput {
  url: string;
  isPrimary: boolean;
}

export interface CreateProductInput {
  categoryId: string;
  title: string;
  description: string;
  condition?: ProductCondition;
  images?: ProductImageInput[];
}

export interface UpdateProductInput {
  categoryId?: string;
  title?: string;
  description?: string;
  condition?: ProductCondition;
  images?: ProductImageInput[];
  status?: 'DRAFT' | 'READY';
}

export interface DeleteProductResponse {
  deleted: boolean;
}

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

  /**
   * Create a new product (starts as DRAFT on backend).
   * Calls POST /api/products.
   */
  async createProduct(input: CreateProductInput): Promise<Product> {
    const res = await apiClient.post<Product>('/api/products', input);
    return res.data;
  },

  /**
   * Update an existing product (fields, full images array replacement, or DRAFT <-> READY status).
   * Calls PATCH /api/products/{id}.
   */
  async updateProduct(id: string, input: UpdateProductInput): Promise<Product> {
    const res = await apiClient.patch<Product>(`/api/products/${id}`, input);
    return res.data;
  },

  /**
   * Delete a DRAFT or READY product.
   * Calls DELETE /api/products/{id}.
   */
  async deleteProduct(id: string): Promise<DeleteProductResponse> {
    const res = await apiClient.delete<DeleteProductResponse>(`/api/products/${id}`);
    return res.data;
  },
};

