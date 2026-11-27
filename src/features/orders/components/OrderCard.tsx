import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Order } from '@/contracts/api.generated';
import { DEFAULT_PRODUCT_PLACEHOLDER } from '@/features/products/components/ProductCard';
import { formatLocalTime } from '@/lib/time';
import { formatOrderAmount } from '../utils/orderHelpers';
import { OrderStatusBadge } from './OrderStatusBadge';
import { OrderRoleTag } from './OrderRoleTag';
import { ArrowRight, Calendar } from 'lucide-react';

export interface OrderCardProps {
  order: Order;
  currentUserId?: string | null;
}

export const OrderCard: React.FC<OrderCardProps> = ({ order, currentUserId }) => {
  const [erroredUrl, setErroredUrl] = useState<string | null>(null);
  const thumbnail = order.productThumbnail;
  const displayImg =
    thumbnail && erroredUrl !== thumbnail ? thumbnail : DEFAULT_PRODUCT_PLACEHOLDER;

  // Defensive optional read: createdAt is not in OpenAPI Order schema,
  // display only if BE includes it in runtime payload.
  const createdAt = (order as Order & { createdAt?: string }).createdAt;

  return (
    <Link
      to={`/orders/${order.id}`}
      className="group block bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs hover:shadow-md hover:border-indigo-200 transition-all duration-150"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Left: Thumbnail + Info */}
        <div className="flex items-start sm:items-center gap-4 min-w-0">
          <div className="h-18 w-18 sm:h-20 sm:w-20 rounded-xl bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
            <img
              key={displayImg}
              src={displayImg}
              alt={order.productTitle ?? 'Sản phẩm đấu giá'}
              loading="lazy"
              onError={() => {
                if (thumbnail) setErroredUrl(thumbnail);
              }}
              className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-200"
            />
          </div>

          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <OrderRoleTag order={order} currentUserId={currentUserId} />
              <OrderStatusBadge status={order.status} size="sm" />
            </div>

            <h2 className="text-sm sm:text-base font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
              {order.productTitle ?? 'Chưa có tên sản phẩm'}
            </h2>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
              <span className="font-mono text-[11px] text-slate-400">
                Mã đơn: #{order.id.slice(0, 8)}
              </span>
              {createdAt && (
                <span className="inline-flex items-center gap-1">
                  <Calendar className="h-3 w-3 text-slate-400" />
                  {formatLocalTime(createdAt)}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Amount + Action */}
        <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 shrink-0">
          <div className="text-left sm:text-right">
            <span className="block text-[11px] font-medium text-slate-400 uppercase tracking-wider">
              Tổng thanh toán
            </span>
            <span className="text-base sm:text-lg font-extrabold text-indigo-600">
              {formatOrderAmount(order.totalAmount)}
            </span>
          </div>

          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 group-hover:text-indigo-600 transition-colors">
            Chi tiết
            <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </Link>
  );
};

