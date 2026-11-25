import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  productApi,
  type CreateProductInput,
  type UpdateProductInput,
} from '@/api/product.api';
import type { Product } from '@/contracts/api.generated';
import { PRODUCT_QUERY_KEYS } from '../../hooks/useProducts';
import { addRecentDraftId, removeRecentDraftId } from '../utils/recentDrafts';

export function useCreateProduct(sellerId?: string) {
  const queryClient = useQueryClient();

  return useMutation<Product, Error, CreateProductInput>({
    mutationFn: (input) => productApi.createProduct(input),
    onSuccess: (createdProduct) => {
      queryClient.setQueryData(
        PRODUCT_QUERY_KEYS.detail(createdProduct.id),
        createdProduct
      );
      void queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.all });
      addRecentDraftId(sellerId || createdProduct.sellerId, createdProduct.id);
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();

  return useMutation<
    Product,
    Error,
    { id: string; input: UpdateProductInput }
  >({
    mutationFn: ({ id, input }) => productApi.updateProduct(id, input),
    onSuccess: (updatedProduct) => {
      queryClient.setQueryData(
        PRODUCT_QUERY_KEYS.detail(updatedProduct.id),
        updatedProduct
      );
      void queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.all });
    },
  });
}

export function useDeleteProduct(sellerId?: string) {
  const queryClient = useQueryClient();

  return useMutation<{ deleted: boolean }, Error, string>({
    mutationFn: (id) => productApi.deleteProduct(id),
    onSuccess: (_result, deletedId) => {
      queryClient.removeQueries({
        queryKey: PRODUCT_QUERY_KEYS.detail(deletedId),
      });
      void queryClient.invalidateQueries({ queryKey: PRODUCT_QUERY_KEYS.all });
      removeRecentDraftId(sellerId, deletedId);
    },
  });
}

