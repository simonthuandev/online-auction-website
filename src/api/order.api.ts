import { apiClient } from './client.ts';
import type {
  Order,
  OrderPage,
  OrderStatus,
  Payment,
} from '../contracts/api.generated.ts';

export interface OrderListParams {
  page?: number;
  pageSize?: number;
  status?: OrderStatus | string;
}

export const orderApi = {
  /**
   * Fetch paginated list of orders where the authenticated user is buyer or seller.
   * Calls GET /api/orders.
   */
  async getOrders(params?: OrderListParams): Promise<OrderPage> {
    const res = await apiClient.get<OrderPage>('/api/orders', {
      params,
    });
    return res.data;
  },

  /**
   * Fetch single order details by ID.
   * Returns 404 if not found or if the current user is neither buyer nor seller.
   * Calls GET /api/orders/{id}.
   */
  async getOrder(id: string): Promise<Order> {
    const res = await apiClient.get<Order>(`/api/orders/${id}`);
    return res.data;
  },

  /**
   * Fetch payment record associated with an order (used optionally for paid orders).
   * Calls GET /api/payments/order/{orderId}.
   */
  async getPaymentByOrderId(orderId: string): Promise<Payment> {
    const res = await apiClient.get<Payment>(`/api/payments/order/${orderId}`);
    return res.data;
  },
};

