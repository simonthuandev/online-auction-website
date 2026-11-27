import React, { useState, useEffect } from 'react';
import { Search, X, Filter, Flame } from 'lucide-react';
import type { PublicAuctionStatus } from '../utils/auctionHelpers';

export interface AuctionFiltersProps {
  selectedStatus?: PublicAuctionStatus;
  searchQuery?: string;
  onFilterChange: (filters: {
    status?: PublicAuctionStatus;
    search?: string;
  }) => void;
  onResetFilters: () => void;
}

const STATUS_TABS: Array<{
  id?: PublicAuctionStatus;
  label: string;
  icon?: boolean;
}> = [
  { id: undefined, label: 'Tất cả phiên' },
  { id: 'ACTIVE', label: 'Đang diễn ra', icon: true },
  { id: 'PENDING', label: 'Sắp mở' },
  { id: 'ENDED', label: 'Đã kết thúc' },
];

export const AuctionFilters: React.FC<AuctionFiltersProps> = ({
  selectedStatus,
  searchQuery = '',
  onFilterChange,
  onResetFilters,
}) => {
  const [localSearch, setLocalSearch] = useState(searchQuery);
  const [prevSearchQuery, setPrevSearchQuery] = useState(searchQuery);

  // Sync local search when prop changes externally (e.g., URL reset or back/forward)
  if (searchQuery !== prevSearchQuery) {
    setPrevSearchQuery(searchQuery);
    setLocalSearch(searchQuery);
  }

  // Debounced search trigger (350ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      const sanitized = localSearch.trim();
      if (sanitized !== (searchQuery ?? '')) {
        onFilterChange({
          status: selectedStatus,
          search: sanitized || undefined,
        });
      }
    }, 350);

    return () => clearTimeout(handler);
  }, [localSearch, selectedStatus, searchQuery, onFilterChange]);

  const handleClearSearch = () => {
    setLocalSearch('');
    onFilterChange({
      status: selectedStatus,
      search: undefined,
    });
  };

  const handleStatusSelect = (status?: PublicAuctionStatus) => {
    onFilterChange({
      status,
      search: localSearch.trim() || undefined,
    });
  };

  const hasActiveFilters = Boolean(selectedStatus || (searchQuery && searchQuery.trim().length > 0));

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          {STATUS_TABS.map((tab) => {
            const isSelected = selectedStatus === tab.id;
            return (
              <button
                key={tab.id ?? 'ALL'}
                type="button"
                onClick={() => handleStatusSelect(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  isSelected
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
              >
                {tab.icon && (
                  <Flame
                    className={`h-3.5 w-3.5 ${
                      isSelected ? 'text-red-500 fill-red-500' : 'text-slate-400'
                    }`}
                  />
                )}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Tìm theo tên sản phẩm..."
              className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition"
            />
            {localSearch && (
              <button
                type="button"
                onClick={handleClearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-200 transition"
                aria-label="Xóa tìm kiếm"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Reset Filters Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-xl transition whitespace-nowrap"
              title="Đặt lại bộ lọc"
            >
              <Filter className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Đặt lại</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
