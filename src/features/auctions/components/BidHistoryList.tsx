import React, { useState } from 'react';
import { useAuctionBids } from '../hooks/useAuctions';
import { formatVnd } from '@/lib/money';
import { formatLocalTime } from '@/lib/time';
import { maskBidderId } from '../utils/auctionHelpers';
import { EmptyState } from '@/components/common/EmptyState';
import {
  Gavel,
  Trophy,
  UserCheck,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Clock,
} from 'lucide-react';

export interface BidHistoryListProps {
  auctionId: string;
  currentUserId?: string | null;
  isEnded?: boolean;
  winnerId?: string | null;
  className?: string;
}

export const BidHistoryList: React.FC<BidHistoryListProps> = ({
  auctionId,
  currentUserId,
  isEnded = false,
  winnerId,
  className = '',
}) => {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const {
    data: bidsPage,
    isLoading,
    isError,
    error,
    refetch,
    isPlaceholderData,
  } = useAuctionBids(auctionId, { page, pageSize });

  const bids = bidsPage?.items ?? [];
  const total = bidsPage?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div
      className={`bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 shadow-xs ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Gavel className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900">
              Lịch sử đặt giá
            </h3>
            <p className="text-2xs sm:text-xs text-slate-500">
              Danh sách lượt bid mới nhất được xếp ở đầu
            </p>
          </div>
        </div>

        {!isLoading && !isError && (
          <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full">
            {total} lượt đặt giá
          </span>
        )}
      </div>

      {/* Body States */}
      <div className="mt-4">
        {isLoading ? (
          /* Loading Skeletons */
          <div className="space-y-3" role="status" aria-label="Đang nạp lịch sử bid">
            {Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl animate-pulse"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 bg-slate-200 rounded-full" />
                  <div className="space-y-1.5">
                    <div className="h-3.5 w-24 bg-slate-200 rounded-sm" />
                    <div className="h-2.5 w-32 bg-slate-200 rounded-sm" />
                  </div>
                </div>
                <div className="h-5 w-28 bg-slate-200 rounded-md" />
              </div>
            ))}
          </div>
        ) : isError ? (
          /* Error State with Retry */
          <div className="p-6 text-center bg-red-50/50 border border-red-100 rounded-xl space-y-3">
            <div className="inline-flex p-2 bg-red-100 text-red-600 rounded-xl">
              <AlertCircle className="h-5 w-5" />
            </div>
            <p className="text-xs text-slate-700">
              {error?.message || 'Không thể tải lịch sử bid. Vui lòng thử lại.'}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition"
            >
              <RefreshCw className="h-3 w-3" /> Thử lại
            </button>
          </div>
        ) : bids.length === 0 ? (
          /* Empty State */
          <EmptyState
            title="Chưa có lượt đặt giá nào"
            description="Hãy là người đầu tiên tham gia đặt giá để sở hữu sản phẩm này!"
            className="py-10"
          />
        ) : (
          /* Bids List */
          <div className="space-y-2.5">
            <div
              className={`space-y-2 transition-opacity ${
                isPlaceholderData ? 'opacity-50' : 'opacity-100'
              }`}
            >
              {bids.map((bid, index) => {
                const isLeadingBid = page === 1 && index === 0;
                const isCurrentUser = Boolean(
                  currentUserId && bid.bidderId === currentUserId
                );
                const isWinner =
                  isEnded && winnerId && bid.bidderId === winnerId;

                return (
                  <div
                    key={bid.id}
                    className={`flex items-center justify-between p-3.5 rounded-xl border transition-all ${
                      isLeadingBid
                        ? 'bg-amber-50/70 border-amber-200 shadow-2xs'
                        : isCurrentUser
                        ? 'bg-indigo-50/50 border-indigo-200'
                        : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/60'
                    }`}
                  >
                    {/* Left: Rank & Bidder info */}
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex items-center justify-center h-8 w-8 rounded-full text-xs font-bold ${
                          isLeadingBid
                            ? 'bg-amber-500 text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {isLeadingBid ? (
                          <Trophy className="h-4 w-4" />
                        ) : (
                          (page - 1) * pageSize + index + 1
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-xs sm:text-sm font-semibold ${
                              isCurrentUser
                                ? 'text-indigo-600 font-bold'
                                : 'text-slate-800'
                            }`}
                          >
                            {maskBidderId(bid.bidderId, currentUserId)}
                          </span>

                          {isCurrentUser && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 text-3xs font-extrabold rounded-md">
                              <UserCheck className="h-3 w-3" />
                              Bạn
                            </span>
                          )}

                          {isLeadingBid && !isEnded && (
                            <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 text-3xs font-extrabold rounded-md">
                              Dẫn đầu
                            </span>
                          )}

                          {isWinner && (
                            <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-3xs font-extrabold rounded-md flex items-center gap-1">
                              <Trophy className="h-2.5 w-2.5 text-emerald-600" />
                              Thắng phiên
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-1 text-2xs text-slate-400 mt-0.5">
                          <Clock className="h-3 w-3" />
                          <span>
                            {bid.createdAt
                              ? formatLocalTime(bid.createdAt)
                              : 'Chưa xác định'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount */}
                    <div className="text-right">
                      <div
                        className={`text-sm sm:text-base font-extrabold ${
                          isLeadingBid ? 'text-amber-700' : 'text-slate-900'
                        }`}
                      >
                        {formatVnd(bid.amount ?? '0')}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs text-slate-600">
                <span>
                  Trang {page} / {totalPages}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1 || isPlaceholderData}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    aria-label="Trang trước"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>

                  <span className="px-2 font-semibold text-slate-800">
                    {page}
                  </span>

                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages || isPlaceholderData}
                    className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    aria-label="Trang sau"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
