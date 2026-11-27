import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAppSelector } from '@/store';
import { DEFAULT_PRODUCT_PLACEHOLDER } from '@/features/products/components/ProductCard';
import { formatLocalTime } from '@/lib/time';
import { OrderStatusBadge } from './components/OrderStatusBadge';
import { OrderRoleTag } from './components/OrderRoleTag';
import { useOrder, useOrderPayment } from './hooks/useOrders';
import {
  formatOrderAmount,
  getOrderErrorStatusCode,
  getOrderRole,
  shouldShowPaymentPanel,
} from './utils/orderHelpers';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  CreditCard,
  ExternalLink,
  FileQuestion,
  Gavel,
  Package,
  RefreshCw,
} from 'lucide-react';
import type { Order, Payment } from '@/contracts/api.generated';

export interface OrderDetailPageProps {
  /**
   * Slot reserved for WEB-PAY-01 (PaymentPanel).
   * Rendered only when current user is the Buyer and order status is PENDING_PAYMENT.
   */
  renderPaymentSlot?: (order: Order) => React.ReactNode;
}

export const OrderDetailPage: React.FC<OrderDetailPageProps> = ({
  renderPaymentSlot,
}) => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAppSelector((state) => state.auth);
  const [erroredImgUrl, setErroredImgUrl] = useState<string | null>(null);

  const {
    data: order,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useOrder(id);

  const isPaidOrCompleted =
    order?.status === 'PAID' || order?.status === 'COMPLETED';

  // Optional payment lookup ONLY for PAID/COMPLETED orders; errors (403/404) are silently ignored
  const { data: payment } = useOrderPayment(
    order?.id,
    Boolean(order?.id && isPaidOrCompleted)
  );

  const errorStatus = getOrderErrorStatusCode(error);
  const isNotFound = errorStatus === 404;

  // 1. Loading Skeleton
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto py-8 space-y-6 animate-pulse">
        <div className="h-5 bg-slate-200 rounded w-40" />
        <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="h-7 bg-slate-200 rounded w-56" />
            <div className="h-7 bg-slate-200 rounded-full w-32" />
          </div>
          <div className="flex gap-5">
            <div className="h-28 w-28 bg-slate-200 rounded-xl shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="h-5 bg-slate-200 rounded w-2/3" />
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-8 bg-slate-200 rounded w-40" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. 404 Not Found (also returned by BE when a third-party user tries to access someone else's order)
  if (isNotFound || (!order && !isLoading && !isError)) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 text-center bg-white border border-slate-200 rounded-2xl shadow-xs space-y-5">
        <div className="inline-flex p-3 bg-amber-50 text-amber-600 rounded-2xl">
          <FileQuestion className="h-10 w-10 stroke-[1.5]" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-xl font-bold text-slate-900">
            Đơn hàng không tồn tại
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Đơn hàng này không tồn tại hoặc bạn không có quyền xem thông tin đơn hàng.
          </p>
        </div>
        <Link
          to="/orders"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition shadow-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          Quay lại danh sách đơn hàng
        </Link>
      </div>
    );
  }

  // 3. Network / Server Error (5xx) — distinct from 404
  if (isError || !order) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 text-center bg-white border border-red-200 rounded-2xl shadow-xs space-y-4">
        <div className="inline-flex p-3 bg-red-50 text-red-600 rounded-2xl">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">
          Không thể tải chi tiết đơn hàng
        </h2>
        <p className="text-xs sm:text-sm text-slate-500">
          {error instanceof Error
            ? error.message
            : 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.'}
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-xl hover:bg-red-700 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Thử lại
          </button>
          <Link
            to="/orders"
            className="inline-flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition"
          >
            Về danh sách
          </Link>
        </div>
      </div>
    );
  }

  const orderRole = getOrderRole(order, user?.id);
  const showPaymentPanel = shouldShowPaymentPanel(order, user?.id);
  const isSellerPending =
    orderRole === 'SELLER' && order.status === 'PENDING_PAYMENT';

  const thumbnail = order.productThumbnail;
  const displayImg =
    thumbnail && erroredImgUrl !== thumbnail
      ? thumbnail
      : DEFAULT_PRODUCT_PLACEHOLDER;

  // Defensive optional timestamp reads (neither Order nor Payment declares paidAt/createdAt in OpenAPI)
  const orderCreatedAt = (order as Order & { createdAt?: string }).createdAt;
  const paymentPaidAt = payment
    ? (payment as Payment & { paidAt?: string; updatedAt?: string }).paidAt ||
      (payment as Payment & { updatedAt?: string }).updatedAt
    : undefined;

  return (
    <div className="max-w-4xl mx-auto pb-12 space-y-6">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link
          to="/orders"
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-indigo-600 transition"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại danh sách đơn hàng</span>
        </Link>

        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`}
          />
          Làm mới
        </button>
      </div>

      {/* Main Order Summary Card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-7 shadow-xs space-y-6">
        {/* Order Header */}
        <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-100">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <OrderRoleTag order={order} currentUserId={user?.id} />
              <OrderStatusBadge status={order.status} />
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900">
              Chi tiết đơn hàng
            </h1>
            <p className="text-xs text-slate-500 font-mono">
              Mã đơn: {order.id}
            </p>
          </div>

          <div className="text-left sm:text-right">
            <span className="block text-xs font-medium text-slate-500">
              Tổng tiền thắng đấu giá
            </span>
            <span className="text-2xl sm:text-3xl font-extrabold text-indigo-600">
              {formatOrderAmount(order.totalAmount)}
            </span>
          </div>
        </div>

        {/* Product Snapshot */}
        <div className="flex flex-col sm:flex-row gap-5 items-start">
          <div className="h-28 w-28 sm:h-32 sm:w-32 rounded-2xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
            <img
              key={displayImg}
              src={displayImg}
              alt={order.productTitle ?? 'Ảnh sản phẩm'}
              onError={() => {
                if (thumbnail) setErroredImgUrl(thumbnail);
              }}
              className="h-full w-full object-cover"
            />
          </div>

          <div className="flex-1 min-w-0 space-y-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Sản phẩm đấu giá
              </span>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-0.5">
                {order.productTitle ?? 'Chưa có tên sản phẩm'}
              </h2>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {order.productId && (
                <Link
                  to={`/products/${order.productId}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  <Package className="h-3.5 w-3.5 text-slate-500" />
                  Xem sản phẩm
                  <ExternalLink className="h-3 w-3 text-slate-400" />
                </Link>
              )}

              {order.auctionId && (
                <Link
                  to={`/auctions/${order.auctionId}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 text-xs font-semibold text-indigo-700 hover:bg-indigo-100 transition"
                >
                  <Gavel className="h-3.5 w-3.5" />
                  Xem phiên đấu giá
                  <ExternalLink className="h-3 w-3" />
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-5 border-t border-slate-100 text-xs sm:text-sm">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-xs text-slate-500 block">Đơn vị tiền tệ</span>
            <span className="font-semibold text-slate-900">
              {order.currency ?? 'VND'}
            </span>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
            <span className="text-xs text-slate-500 block">Trạng thái đơn</span>
            <OrderStatusBadge status={order.status} size="sm" />
          </div>

          {orderCreatedAt && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                Ngày tạo đơn
              </span>
              <span className="font-semibold text-slate-900">
                {formatLocalTime(orderCreatedAt)}
              </span>
            </div>
          )}

          {isPaidOrCompleted && paymentPaidAt && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 space-y-1">
              <span className="text-xs text-emerald-700 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Ngày thanh toán
              </span>
              <span className="font-semibold text-emerald-900">
                {formatLocalTime(paymentPaidAt)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Payment Section Slot (Buyer + PENDING_PAYMENT only) */}
      {showPaymentPanel && (
        <section aria-label="Thanh toán đơn hàng">
          {renderPaymentSlot ? (
            renderPaymentSlot(order)
          ) : (
            <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-5 sm:p-6 space-y-3">
              <div className="flex items-center gap-2.5 text-indigo-900">
                <CreditCard className="h-5 w-5 text-indigo-600" />
                <h2 className="text-base font-bold">
                  Thanh toán đơn hàng ({formatOrderAmount(order.totalAmount)})
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-indigo-800">
                Đơn hàng đang chờ bạn hoàn tất thanh toán. Khối thanh toán (COD / VNPay) từ module{' '}
                <code className="px-1.5 py-0.5 rounded bg-white/80 font-mono text-xs">
                  WEB-PAY-01
                </code>{' '}
                sẽ được gắn tại vị trí này.
              </p>
            </div>
          )}
        </section>
      )}

      {/* Seller Notice when PENDING_PAYMENT */}
      {isSellerPending && (
        <div
          className="flex items-start gap-3 p-4 sm:p-5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900"
          role="status"
        >
          <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5 text-xs sm:text-sm">
            <p className="font-bold">Đang chờ người mua thanh toán</p>
            <p className="text-amber-800">
              Hệ thống sẽ cập nhật trạng thái đơn hàng ngay sau khi người mua hoàn tất thanh toán.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

