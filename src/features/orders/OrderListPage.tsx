import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppSelector } from '@/store';
import { EmptyState } from '@/components/common/EmptyState';
import { OrderCard } from './components/OrderCard';
import { useOrders } from './hooks/useOrders';
import {
  ORDER_STATUSES,
  ORDER_STATUS_CONFIG,
  buildOrderSearchParams,
  parseOrderFilters,
  type ValidOrderStatus,
} from './utils/orderHelpers';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';

export const OrderListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);

  const filters = parseOrderFilters(searchParams);

  const {
    data: orderPage,
    isLoading,
    isFetching,
    isError,
    error,
    refetch,
  } = useOrders(filters);

  const orders = orderPage?.items ?? [];
  const total = orderPage?.total ?? 0;
  const pageSize = orderPage?.pageSize ?? filters.pageSize;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const handleStatusChange = (nextStatus?: ValidOrderStatus) => {
    // Reset to page 1 whenever filter changes
    const nextParams = buildOrderSearchParams({
      page: 1,
      pageSize: filters.pageSize,
      status: nextStatus,
    });
    setSearchParams(nextParams);
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > totalPages) return;
    const nextParams = buildOrderSearchParams({
      ...filters,
      page: nextPage,
    });
    setSearchParams(nextParams);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 text-indigo-600 rounded-xl">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
              Đơn hàng của tôi
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Theo dõi các đơn mua thắng đấu giá và đơn bán sản phẩm của bạn
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => void refetch()}
          disabled={isFetching}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 transition shadow-xs"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`}
          />
          Làm mới
        </button>
      </div>

      {/* Status Filter Tabs */}
      <div
        className="flex flex-wrap items-center gap-2 bg-white border border-slate-200 rounded-2xl p-2 shadow-xs"
        role="tablist"
        aria-label="Lọc đơn hàng theo trạng thái"
      >
        <button
          type="button"
          role="tab"
          aria-selected={!filters.status}
          onClick={() => handleStatusChange(undefined)}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
            !filters.status
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Tất cả
        </button>

        {ORDER_STATUSES.map((status) => {
          const meta = ORDER_STATUS_CONFIG[status];
          const isSelected = filters.status === status;
          return (
            <button
              key={status}
              type="button"
              role="tab"
              aria-selected={isSelected}
              onClick={() => handleStatusChange(status)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* 1. Loading State (Skeleton) */}
      {isLoading && (
        <div className="space-y-3 animate-pulse">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-28 bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4"
            >
              <div className="h-20 w-20 rounded-xl bg-slate-200 shrink-0" />
              <div className="flex-1 space-y-2.5">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-4 bg-slate-200 rounded w-2/3" />
                <div className="h-3 bg-slate-200 rounded w-1/4" />
              </div>
              <div className="h-8 w-28 bg-slate-200 rounded-lg hidden sm:block" />
            </div>
          ))}
        </div>
      )}

      {/* 2. Error State */}
      {!isLoading && isError && (
        <div className="max-w-lg mx-auto my-12 p-8 text-center bg-white border border-red-200 rounded-2xl shadow-xs space-y-4">
          <div className="inline-flex p-3 bg-red-50 text-red-600 rounded-2xl">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Không thể tải danh sách đơn hàng
          </h2>
          <p className="text-xs sm:text-sm text-slate-500">
            {error instanceof Error
              ? error.message
              : 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng và thử lại.'}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-xl hover:bg-red-700 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Thử lại
          </button>
        </div>
      )}

      {/* 3. Empty State */}
      {!isLoading && !isError && orders.length === 0 && (
        <EmptyState
          title={
            filters.status
              ? `Không có đơn hàng nào ở trạng thái "${ORDER_STATUS_CONFIG[filters.status].label}"`
              : 'Bạn chưa có đơn hàng nào'
          }
          description="Khi bạn thắng phiên đấu giá hoặc có sản phẩm được mua thành công, đơn hàng sẽ hiển thị tại đây."
          actionText={filters.status ? 'Xem tất cả đơn hàng' : 'Khám phá sản phẩm'}
          onAction={() => {
            if (filters.status) {
              handleStatusChange(undefined);
            } else {
              navigate('/products');
            }
          }}
        />
      )}

      {/* 4. Success State */}
      {!isLoading && !isError && orders.length > 0 && (
        <div className="space-y-4">
          <div
            className={`space-y-3 transition-opacity ${
              isFetching ? 'opacity-65' : 'opacity-100'
            }`}
          >
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                currentUserId={user?.id}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-200">
              <p className="text-xs text-slate-500">
                Trang <span className="font-semibold text-slate-800">{filters.page}</span> /{' '}
                <span className="font-semibold text-slate-800">{totalPages}</span> (Tổng{' '}
                {total} đơn hàng)
              </p>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePageChange(filters.page - 1)}
                  disabled={filters.page <= 1}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Trước
                </button>
                <button
                  type="button"
                  onClick={() => handlePageChange(filters.page + 1)}
                  disabled={filters.page >= totalPages}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                >
                  Sau
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
