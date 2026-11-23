import React, { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProducts, useCategories } from './hooks/useProducts';
import { parseProductFilters, buildProductFilterParams } from './utils/filterHelpers';
import { ProductCard } from './components/ProductCard';
import { ProductFilters } from './components/ProductFilters';
import { EmptyState } from '@/components/common/EmptyState';
import {
  Package,
  AlertCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { PublicProductStatus } from './utils/filterHelpers';

export const ProductListPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // Parse and sanitize filters strictly from URL search params
  const filters = parseProductFilters(searchParams);

  // Fetch categories for filter dropdown
  const { data: categoryData, isLoading: isLoadingCategories } = useCategories({
    page: 1,
    pageSize: 100,
  });

  // Fetch paginated products with current filters
  const {
    data: productPage,
    isLoading,
    isError,
    error,
    refetch,
    isPlaceholderData,
  } = useProducts(filters);

  // Filter change handler: updates URL and always resets page to 1
  const handleFilterChange = useCallback(
    (newFilters: {
      categoryId?: string;
      status?: PublicProductStatus;
      search?: string;
    }) => {
      const nextParams = buildProductFilterParams({
        ...filters,
        ...newFilters,
        page: 1, // Always reset page to 1 on filter modification
      });
      setSearchParams(nextParams);
    },
    [filters, setSearchParams]
  );

  // Reset all filters back to default
  const handleResetFilters = useCallback(() => {
    setSearchParams(new URLSearchParams());
  }, [setSearchParams]);

  // Page change handler
  const handlePageChange = useCallback(
    (newPage: number) => {
      const nextParams = buildProductFilterParams({
        ...filters,
        page: newPage,
      });
      setSearchParams(nextParams);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [filters, setSearchParams]
  );

  const categories = categoryData?.items ?? [];
  const products = productPage?.items ?? [];
  const total = productPage?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize));
  const currentPage = Math.min(filters.page, totalPages);

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
            <Package className="h-7 w-7" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Khám phá sản phẩm
            </h1>
            <p className="text-xs sm:text-sm text-slate-500">
              Danh sách sản phẩm công khai sẵn sàng cho các phiên đấu giá
            </p>
          </div>
        </div>

        {/* Counter Badge */}
        {!isLoading && !isError && (
          <div className="text-xs text-slate-500 font-medium bg-slate-100 px-3 py-1.5 rounded-full self-start sm:self-auto">
            Tổng cộng: <span className="font-bold text-slate-900">{total}</span> sản phẩm
          </div>
        )}
      </div>

      {/* Filter Toolbar */}
      <ProductFilters
        categories={categories}
        selectedCategoryId={filters.categoryId}
        selectedStatus={filters.status}
        searchQuery={filters.search}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        isLoadingCategories={isLoadingCategories}
      />

      {/* Main Content Area */}
      {isLoading ? (
        /* Loading Skeleton */
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5"
          role="status"
          aria-label="Đang nạp danh sách sản phẩm"
        >
          {Array.from({ length: 8 }).map((_, idx) => (
            <div
              key={idx}
              className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs animate-pulse"
            >
              <div className="aspect-4/3 bg-slate-200" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-slate-200 rounded-md w-1/3" />
                <div className="h-5 bg-slate-200 rounded-md w-3/4" />
                <div className="h-3 bg-slate-200 rounded-md w-full" />
                <div className="h-3 bg-slate-200 rounded-md w-2/3" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        /* Error State with Retry Button */
        <div className="max-w-md mx-auto my-12 p-8 text-center bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
          <div className="inline-flex p-3 bg-red-50 text-red-600 rounded-2xl">
            <AlertCircle className="h-8 w-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">
            Không thể tải danh sách sản phẩm
          </h2>
          <p className="text-xs text-slate-500">
            {error?.message || 'Không thể kết nối đến máy chủ. Vui lòng thử lại sau.'}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Thử lại
          </button>
        </div>
      ) : products.length === 0 ? (
        /* Empty State */
        <EmptyState
          title="Không có sản phẩm phù hợp"
          description="Rất tiếc, không tìm thấy sản phẩm nào khớp với bộ lọc tìm kiếm hiện tại của bạn."
          actionText={
            filters.categoryId || filters.status || filters.search
              ? 'Xóa tất cả bộ lọc'
              : undefined
          }
          onAction={handleResetFilters}
        />
      ) : (
        /* Success State: Product Grid */
        <div className="space-y-8">
          <div
            className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 transition-opacity duration-200 ${
              isPlaceholderData ? 'opacity-60' : 'opacity-100'
            }`}
          >
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-slate-200 text-sm">
              <span className="text-xs text-slate-500">
                Hiển thị trang <span className="font-semibold">{currentPage}</span> /{' '}
                <span className="font-semibold">{totalPages}</span> (tổng {total} sản phẩm)
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage <= 1 || isPlaceholderData}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  aria-label="Trang trước"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span>Trang trước</span>
                </button>

                {/* Page numbers (up to 5 pages) */}
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => {
                      return (
                        p === 1 ||
                        p === totalPages ||
                        Math.abs(p - currentPage) <= 1
                      );
                    })
                    .map((p, idx, arr) => {
                      const showEllipsis = idx > 0 && p - arr[idx - 1] > 1;
                      return (
                        <React.Fragment key={p}>
                          {showEllipsis && (
                            <span className="px-2 text-slate-400 text-xs">…</span>
                          )}
                          <button
                            type="button"
                            onClick={() => handlePageChange(p)}
                            disabled={isPlaceholderData}
                            className={`min-w-8 h-8 flex items-center justify-center text-xs rounded-lg font-medium transition ${
                              p === currentPage
                                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                                : 'text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      );
                    })}
                </div>

                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage >= totalPages || isPlaceholderData}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  aria-label="Trang sau"
                >
                  <span>Trang sau</span>
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
