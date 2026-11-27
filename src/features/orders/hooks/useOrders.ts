import { useQuery, keepPreviousData, type QueryClient } from '@tanstack/react-query';
import { orderApi, type OrderListParams } from '@/api/order.api';
import type { Order, OrderPage, Payment } from '@/contracts/api.generated';
import { getOrderErrorStatusCode } from '../utils/orderHelpers';

export const ORDER_QUERY_KEYS = {
  all: ['orders'] as const,
  list: (params?: OrderListParams) => ['orders', 'list', params] as const,
  detail: (id: string) => ['orders', 'detail', id] as const,
  payment: (orderId: string) => ['payments', 'order', orderId] as const,
};

/**
 * Hook to fetch paginated orders for the authenticated user.
 * Keeps previous page data while loading next page and refetches on focus/mount
 * to surface asynchronously created post-auction orders promptly.
 */
export function useOrders(filters: OrderListParams) {
  return useQuery<OrderPage, Error>({
    queryKey: ORDER_QUERY_KEYS.list(filters),
    queryFn: () => orderApi.getOrders(filters),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 15,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });
}

/**
 * Hook to fetch single order detail by ID.
 * Does not retry on 404 (not found or unauthorized third party).
 */
export function useOrder(id?: string) {
  return useQuery<Order, Error>({
    queryKey: ORDER_QUERY_KEYS.detail(id || ''),
    queryFn: () => {
      if (!id) throw new Error('Mã đơn hàng không hợp lệ');
      return orderApi.getOrder(id);
    },
    enabled: Boolean(id),
    staleTime: 1000 * 15,
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      if (getOrderErrorStatusCode(error) === 404) {
        return false;
      }
      return failureCount < 2;
    },
  });
}

/**
 * Optional hook to fetch payment details for PAID/COMPLETED orders.
 * Never retries on errors so 403/404 never degrades the order detail page.
 */
export function useOrderPayment(orderId?: string, enabled = false) {
  return useQuery<Payment, Error>({
    queryKey: ORDER_QUERY_KEYS.payment(orderId || ''),
    queryFn: () => {
      if (!orderId) throw new Error('Mã đơn hàng không hợp lệ');
      return orderApi.getPaymentByOrderId(orderId);
    },
    enabled: Boolean(orderId) && enabled,
    retry: false,
    staleTime: 1000 * 60,
  });
}

/**
 * Helper for WEB-PAY-01 to invalidate order detail & order list queries
 * immediately after a successful payment or COD confirmation.
 */
export async function invalidateOrderQueries(
  queryClient: QueryClient,
  orderId?: string
): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: ORDER_QUERY_KEYS.all });
  if (orderId) {
    await queryClient.invalidateQueries({
      queryKey: ORDER_QUERY_KEYS.detail(orderId),
    });
    await queryClient.invalidateQueries({
      queryKey: ORDER_QUERY_KEYS.payment(orderId),
    });
  }
}

