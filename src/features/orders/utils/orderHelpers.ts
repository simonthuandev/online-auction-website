import type { Order, OrderStatus } from '../../../contracts/api.generated.ts';
import { formatVnd } from '../../../lib/money.ts';

export const ORDER_STATUSES = [
  'PENDING_PAYMENT',
  'PAID',
  'CANCELLED',
  'COMPLETED',
] as const;

export type ValidOrderStatus = (typeof ORDER_STATUSES)[number];

export const DEFAULT_ORDER_PAGE_SIZE = 20;

export interface ParsedOrderFilters {
  page: number;
  pageSize: number;
  status?: ValidOrderStatus;
}

export interface OrderStatusMeta {
  label: string;
  className: string;
  dotColor: string;
}

export const ORDER_STATUS_CONFIG: Record<ValidOrderStatus, OrderStatusMeta> = {
  PENDING_PAYMENT: {
    label: 'Chờ thanh toán',
    className: 'bg-amber-50 text-amber-700 border-amber-200',
    dotColor: 'bg-amber-500',
  },
  PAID: {
    label: 'Đã thanh toán',
    className: 'bg-sky-50 text-sky-700 border-sky-200',
    dotColor: 'bg-sky-500',
  },
  COMPLETED: {
    label: 'Hoàn tất',
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    dotColor: 'bg-emerald-500',
  },
  CANCELLED: {
    label: 'Đã hủy',
    className: 'bg-slate-100 text-slate-600 border-slate-200',
    dotColor: 'bg-slate-400',
  },
};

/**
 * Parses and sanitizes order list filters from URLSearchParams.
 * Invalid page, pageSize, or status values are normalized or ignored.
 */
export function parseOrderFilters(
  searchParams: URLSearchParams
): ParsedOrderFilters {
  const rawPage = searchParams.get('page');
  const parsedPage = rawPage ? parseInt(rawPage, 10) : 1;
  const page = Number.isFinite(parsedPage) && parsedPage >= 1 ? parsedPage : 1;

  const rawPageSize = searchParams.get('pageSize');
  const parsedPageSize = rawPageSize
    ? parseInt(rawPageSize, 10)
    : DEFAULT_ORDER_PAGE_SIZE;
  const pageSize =
    Number.isFinite(parsedPageSize) &&
    parsedPageSize >= 1 &&
    parsedPageSize <= 100
      ? parsedPageSize
      : DEFAULT_ORDER_PAGE_SIZE;

  const rawStatus = searchParams.get('status')?.trim().toUpperCase();
  const status =
    rawStatus && (ORDER_STATUSES as readonly string[]).includes(rawStatus)
      ? (rawStatus as ValidOrderStatus)
      : undefined;

  return {
    page,
    pageSize,
    status,
  };
}

/**
 * Builds clean URLSearchParams from normalized order filters.
 */
export function buildOrderSearchParams(
  filters: ParsedOrderFilters
): URLSearchParams {
  const next = new URLSearchParams();
  if (filters.status) {
    next.set('status', filters.status);
  }
  if (filters.page > 1) {
    next.set('page', String(filters.page));
  }
  if (filters.pageSize !== DEFAULT_ORDER_PAGE_SIZE) {
    next.set('pageSize', String(filters.pageSize));
  }
  return next;
}

/**
 * Determines whether the current user is the buyer or seller of an order
 * strictly by comparing user ID against buyerId / sellerId (never by account role).
 */
export function getOrderRole(
  order: Pick<Order, 'buyerId' | 'sellerId'>,
  currentUserId?: string | null
): 'BUYER' | 'SELLER' | null {
  if (!currentUserId) return null;
  if (order.buyerId === currentUserId) return 'BUYER';
  if (order.sellerId === currentUserId) return 'SELLER';
  return null;
}

/**
 * Payment panel is shown ONLY to the buyer when the order is PENDING_PAYMENT.
 */
export function shouldShowPaymentPanel(
  order: Pick<Order, 'buyerId' | 'status'>,
  currentUserId?: string | null
): boolean {
  if (!currentUserId) return false;
  return order.buyerId === currentUserId && order.status === 'PENDING_PAYMENT';
}

/**
 * Formats VND integer string safely using BigInt helper without precision loss.
 */
export function formatOrderAmount(amount?: string | null): string {
  if (!amount) return '0 ₫';
  return formatVnd(amount);
}

/**
 * Extracts HTTP status code from ApiError or Axios-like errors.
 */
export function getOrderErrorStatusCode(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  if (
    'statusCode' in error &&
    typeof (error as { statusCode?: unknown }).statusCode === 'number'
  ) {
    return (error as { statusCode: number }).statusCode;
  }
  if (
    'response' in error &&
    (error as { response?: { status?: unknown } }).response &&
    typeof (error as { response: { status?: unknown } }).response.status ===
      'number'
  ) {
    return (error as { response: { status: number } }).response.status;
  }
  return undefined;
}

export function getOrderStatusMeta(status: OrderStatus | string): OrderStatusMeta {
  if ((ORDER_STATUSES as readonly string[]).includes(status)) {
    return ORDER_STATUS_CONFIG[status as ValidOrderStatus];
  }
  return {
    label: status || 'Không xác định',
    className: 'bg-gray-100 text-gray-700 border-gray-200',
    dotColor: 'bg-gray-400',
  };
}

