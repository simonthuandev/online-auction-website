import React, { useState, useEffect } from 'react';
import type { Category } from '@/contracts/api.generated';
import type { PublicProductStatus } from '../utils/filterHelpers';
import { PUBLIC_PRODUCT_STATUSES } from '../utils/filterHelpers';
import { Search, X, Filter, Folder } from 'lucide-react';

export interface ProductFiltersProps {
  categories: Category[];
  selectedCategoryId?: string;
  selectedStatus?: PublicProductStatus;
  searchQuery?: string;
  onFilterChange: (filters: {
    categoryId?: string;
    status?: PublicProductStatus;
    search?: string;
  }) => void;
  onResetFilters: () => void;
  isLoadingCategories?: boolean;
}

const STATUS_LABELS: Record<PublicProductStatus, string> = {
  READY: 'Sẵn sàng đấu giá',
  RESERVED: 'Đã giữ chỗ',
  IN_AUCTION: 'Đang đấu giá',
  SOLD: 'Đã bán',
};

export const ProductFilters: React.FC<ProductFiltersProps> = ({
  categories,
  selectedCategoryId,
  selectedStatus,
  searchQuery = '',
  onFilterChange,
  onResetFilters,
  isLoadingCategories = false,
}) => {
  // Local state for immediate input typing
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [prevSearchQuery, setPrevSearchQuery] = useState(searchQuery);

  // Sync local search when prop changes externally (e.g., URL reset or back/forward)
  if (searchQuery !== prevSearchQuery) {
    setPrevSearchQuery(searchQuery);
    setLocalSearch(searchQuery);
  }

  // Debounce search input by 350ms
  useEffect(() => {
    const handler = setTimeout(() => {
      const trimmed = localSearch.trim();
      const currentTrimmed = (searchQuery || '').trim();
      if (trimmed !== currentTrimmed) {
        onFilterChange({
          categoryId: selectedCategoryId,
          status: selectedStatus,
          search: trimmed || undefined,
        });
      }
    }, 350);

    return () => clearTimeout(handler);
  }, [localSearch, searchQuery, selectedCategoryId, selectedStatus, onFilterChange]);

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    onFilterChange({
      categoryId: val || undefined,
      status: selectedStatus,
      search: searchQuery || undefined,
    });
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as PublicProductStatus | '';
    onFilterChange({
      categoryId: selectedCategoryId,
      status: val || undefined,
      search: searchQuery || undefined,
    });
  };

  const hasActiveFilters = Boolean(
    selectedCategoryId || selectedStatus || (searchQuery && searchQuery.trim())
  );

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 items-center">
        {/* Search Input */}
        <div className="relative sm:col-span-2">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4 w-4" />
          </div>
          <input
            type="text"
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc mô tả sản phẩm..."
            className="block w-full pl-9 pr-9 py-2 text-sm rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-slate-900 bg-white placeholder:text-slate-400 outline-none transition"
            aria-label="Tìm kiếm sản phẩm"
          />
          {localSearch && (
            <button
              type="button"
              onClick={() => {
                setLocalSearch('');
                onFilterChange({
                  categoryId: selectedCategoryId,
                  status: selectedStatus,
                  search: undefined,
                });
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition"
              aria-label="Xóa từ khóa tìm kiếm"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Folder className="h-4 w-4" />
          </div>
          <select
            value={selectedCategoryId || ''}
            onChange={handleCategoryChange}
            disabled={isLoadingCategories}
            className="block w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-slate-900 bg-white outline-none transition appearance-none cursor-pointer disabled:bg-slate-50"
            aria-label="Lọc theo danh mục"
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter (Excludes DRAFT) */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Filter className="h-4 w-4" />
          </div>
          <select
            value={selectedStatus || ''}
            onChange={handleStatusChange}
            className="block w-full pl-9 pr-8 py-2 text-sm rounded-xl border border-slate-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 text-slate-900 bg-white outline-none transition appearance-none cursor-pointer"
            aria-label="Lọc theo trạng thái"
          >
            <option value="">Tất cả trạng thái</option>
            {PUBLIC_PRODUCT_STATUSES.map((st) => (
              <option key={st} value={st}>
                {STATUS_LABELS[st]}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Active Filter Pills and Reset Button */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
          <span className="text-slate-500 font-medium">Đang lọc:</span>

          {searchQuery && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-medium border border-indigo-100">
              Từ khóa: "{searchQuery}"
              <button
                type="button"
                onClick={() => {
                  setLocalSearch('');
                  onFilterChange({
                    categoryId: selectedCategoryId,
                    status: selectedStatus,
                    search: undefined,
                  });
                }}
                className="hover:text-indigo-900"
                aria-label="Bỏ lọc từ khóa"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {selectedCategoryId && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-medium border border-indigo-100">
              Danh mục:{' '}
              {categories.find((c) => c.id === selectedCategoryId)?.name || 'Đã chọn'}
              <button
                type="button"
                onClick={() =>
                  onFilterChange({
                    categoryId: undefined,
                    status: selectedStatus,
                    search: searchQuery || undefined,
                  })
                }
                className="hover:text-indigo-900"
                aria-label="Bỏ lọc danh mục"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          {selectedStatus && (
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-lg font-medium border border-indigo-100">
              Trạng thái: {STATUS_LABELS[selectedStatus]}
              <button
                type="button"
                onClick={() =>
                  onFilterChange({
                    categoryId: selectedCategoryId,
                    status: undefined,
                    search: searchQuery || undefined,
                  })
                }
                className="hover:text-indigo-900"
                aria-label="Bỏ lọc trạng thái"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}

          <button
            type="button"
            onClick={onResetFilters}
            className="ml-auto text-xs font-semibold text-red-600 hover:text-red-700 transition"
          >
            Xóa tất cả bộ lọc
          </button>
        </div>
      )}
    </div>
  );
};
