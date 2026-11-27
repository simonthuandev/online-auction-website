import React, { useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuction, useAuctionBids } from './hooks/useAuctions';
import { useAuctionSocket } from './hooks/useAuctionSocket';
import { BidBox } from './components/BidBox';
import { useAppSelector } from '@/store';
import { formatVnd } from '@/lib/money';
import { formatLocalTime } from '@/lib/time';
import { AuctionStatusBadge } from './components/AuctionStatusBadge';
import { CountdownTimer } from './components/CountdownTimer';
import { BidHistoryList } from './components/BidHistoryList';
import { maskBidderId, isUserLeadingBidder } from './utils/auctionHelpers';
import {
  Trophy,
  UserCheck,
  AlertTriangle,
  Clock,
  ArrowLeft,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Calendar,
  Tag,
  TrendingUp,
  Sparkles,
  Radio,
} from 'lucide-react';

const DEFAULT_IMAGE =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';

export const AuctionDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [imageError, setImageError] = useState(false);

  // Authenticated user from Redux store
  const currentUser = useAppSelector((state) => state.auth.user);

  // Parallel API queries:
  // 1. Single auction details
  const {
    data: auction,
    isLoading: isLoadingAuction,
    isError: isAuctionError,
    error: auctionError,
    refetch: refetchAuction,
  } = useAuction(id);

  // 2. Initial page of bids to determine leading bidder (bids[0].bidderId)
  const {
    data: bidsPage,
    refetch: refetchBids,
  } = useAuctionBids(id, { page: 1, pageSize: 10 });

  // 3. Realtime Socket synchronization
  const {
    isPriceUpdated,
    latestBidderId: socketLatestBidderId,
    isConnected: isSocketConnected,
  } = useAuctionSocket({
    auctionId: auction?.id,
    currentVersion: auction?.version ?? 0,
    enabled: Boolean(auction?.id),
  });

  // Countdown timer onZero callback: refetches auction after 1-2s delay to catch phase transition
  const handleCountdownZero = useCallback(() => {
    void refetchAuction();
    void refetchBids();
  }, [refetchAuction, refetchBids]);

  // Loading state
  if (isLoadingAuction) {
    return (
      <div
        className="max-w-6xl mx-auto space-y-8 animate-pulse pb-16"
        role="status"
        aria-label="Đang nạp thông tin phiên đấu giá"
      >
        <div className="h-6 w-48 bg-slate-200 rounded-md" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-6 space-y-4">
            <div className="aspect-4/3 bg-slate-200 rounded-2xl" />
            <div className="h-8 bg-slate-200 rounded-md w-3/4" />
            <div className="h-4 bg-slate-200 rounded-md w-1/2" />
          </div>
          <div className="lg:col-span-6 space-y-6">
            <div className="h-40 bg-slate-200 rounded-2xl" />
            <div className="h-60 bg-slate-200 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (isAuctionError || !auction) {
    return (
      <div className="max-w-md mx-auto my-16 p-8 text-center bg-white border border-slate-200 rounded-3xl shadow-xs space-y-4">
        <div className="inline-flex p-3 bg-red-50 text-red-600 rounded-2xl">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">
          Không tìm thấy phiên đấu giá
        </h2>
        <p className="text-sm text-slate-500">
          {auctionError?.message ||
            'Phiên đấu giá không tồn tại hoặc đã bị gỡ bỏ khỏi hệ thống.'}
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            to="/auctions"
            className="inline-flex items-center gap-1.5 px-4 py-2 border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Sàn đấu giá
          </Link>
          <button
            type="button"
            onClick={() => {
              void refetchAuction();
              void refetchBids();
            }}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Thử lại
          </button>
        </div>
      </div>
    );
  }

  // Determine Leading Bidder:
  // Per backend specification, OpenAPI Auction does NOT contain leadingBidderId.
  // Leading bidder is the newest bid (socket latest or bidsPage?.items?.[0]?.bidderId).
  const latestBid = bidsPage?.items?.[0];
  const effectiveLeadingBidderId = socketLatestBidderId || latestBid?.bidderId || null;
  const isLeading = isUserLeadingBidder(effectiveLeadingBidderId, currentUser?.id);
  const isSeller = Boolean(currentUser?.id && auction.sellerId === currentUser.id);

  // Status flags
  const isPending = auction.status === 'PENDING';
  const isActive = auction.status === 'ACTIVE';
  const isEnded = auction.status === 'ENDED';
  const isCancelled = auction.status === 'CANCELLED';
  const isInitializing = auction.status === 'INITIALIZING';

  // Winner check if ENDED
  const isWinner = Boolean(
    isEnded && currentUser?.id && auction.winnerId === currentUser.id
  );

  const displayImageSrc =
    !imageError && auction.productThumbnail
      ? auction.productThumbnail
      : DEFAULT_IMAGE;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-16">
      {/* Breadcrumb Navigation & Realtime Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <nav className="flex items-center gap-2 text-xs text-slate-500">
          <Link to="/" className="hover:text-slate-900 transition">
            Trang chủ
          </Link>
          <span>/</span>
          <Link to="/auctions" className="hover:text-slate-900 transition">
            Phiên đấu giá
          </Link>
          <span>/</span>
          <span className="text-slate-900 font-medium truncate max-w-xs sm:max-w-md">
            {auction.productTitle ?? 'Chi tiết'}
          </span>
        </nav>

        {/* Realtime Socket Status Pill */}
        {isActive && (
          <div className="flex items-center gap-1.5 text-2xs font-semibold px-2.5 py-1 bg-slate-100 rounded-full text-slate-600 self-start sm:self-auto">
            <Radio
              className={`h-3 w-3 ${
                isSocketConnected ? 'text-emerald-500 animate-pulse' : 'text-slate-400'
              }`}
            />
            <span>{isSocketConnected ? 'Realtime kết nối' : 'Đang kết nối socket...'}</span>
          </div>
        )}
      </div>

      {/* Cancelled Notice Banner (Rule 10 in plan) */}
      {isCancelled && (
        <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800">
          <AlertTriangle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-sm">Phiên đấu giá đã bị hủy</h4>
            <p className="text-xs text-red-700 mt-0.5">
              Phiên đấu giá bị hủy do không thể giữ sản phẩm hoặc xảy ra xung đột trong hệ thống.
            </p>
          </div>
        </div>
      )}

      {/* Initializing Notice Banner (Rule WEB-AUC-03) */}
      {isInitializing && (
        <div className="flex items-start gap-3 p-4 bg-sky-50 border border-sky-200 rounded-2xl text-sky-900 shadow-xs">
          <RefreshCw className="h-5 w-5 text-sky-600 shrink-0 mt-0.5 animate-spin" />
          <div>
            <h4 className="font-bold text-sm">Đang giữ sản phẩm và khởi tạo phiên...</h4>
            <p className="text-xs text-sky-700 mt-0.5">
              Hệ thống đang tiến hành giữ sản phẩm (reservation) và chuyển trạng thái phiên đấu giá sang PENDING. Trạng thái phiên sẽ tự động cập nhật ngay khi hoàn tất.
            </p>
          </div>
        </div>
      )}

      {/* Winner Congratulations Banner if user is the winner */}
      {isWinner && (
        <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-900 shadow-xs">
          <Trophy className="h-6 w-6 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-bold text-sm sm:text-base text-emerald-900">
              Chúc mừng! Bạn là người chiến thắng phiên đấu giá này!
            </h4>
            <p className="text-xs text-emerald-700 mt-1">
              Giá chốt phiên:{' '}
              <span className="font-bold text-emerald-900">
                {formatVnd(auction.finalPrice ?? auction.currentPrice ?? '0')}
              </span>
              . Vui lòng chuyển tới mục Đơn hàng để hoàn tất thanh toán.
            </p>
            <div className="mt-2.5">
              <Link
                to="/orders"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white text-xs font-semibold rounded-lg hover:bg-emerald-700 transition"
              >
                Xem đơn hàng của bạn
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Main Room Layout: 2 Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Product Details & Thumbnail */}
        <div className="lg:col-span-7 space-y-6">
          {/* Thumbnail Container */}
          <div className="relative aspect-4/3 bg-slate-100 rounded-3xl overflow-hidden border border-slate-200 shadow-xs">
            <img
              key={displayImageSrc}
              src={displayImageSrc}
              alt={auction.productTitle ?? 'Sản phẩm'}
              onError={() => setImageError(true)}
              className="h-full w-full object-cover"
            />
            <div className="absolute top-4 left-4">
              <AuctionStatusBadge status={auction.status} size="md" />
            </div>

            {isActive && (
              <div className="absolute top-4 right-4 bg-red-600 text-white text-xs font-extrabold px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md">
                <span className="h-2 w-2 rounded-full bg-white animate-ping" />
                ĐANG DIỄN RA
              </div>
            )}
          </div>

          {/* Product Title & Link */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-4">
            <div className="space-y-2">
              <h1 className="text-xl sm:text-2xl font-extrabold text-slate-900 leading-tight">
                {auction.productTitle ?? 'Chưa có tiêu đề'}
              </h1>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                <span className="flex items-center gap-1">
                  <Tag className="h-3.5 w-3.5 text-slate-400" />
                  Mã phiên: <code className="font-mono text-slate-700">{auction.id.slice(0, 8)}...</code>
                </span>

                <span>•</span>

                <span className="flex items-center gap-1">
                  Người bán:{' '}
                  <span className="font-medium text-slate-700">
                    {maskBidderId(auction.sellerId, currentUser?.id)}
                  </span>
                  {isSeller && (
                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 text-3xs font-bold rounded">
                      (Bạn)
                    </span>
                  )}
                </span>
              </div>
            </div>

            {/* Time Schedule Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-100 text-xs">
              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
                <Calendar className="h-4 w-4 text-slate-400" />
                <div>
                  <div className="text-2xs text-slate-400 font-medium">Bắt đầu:</div>
                  <div className="font-semibold text-slate-800">
                    {formatLocalTime(auction.startTime)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl">
                <Clock className="h-4 w-4 text-slate-400" />
                <div>
                  <div className="text-2xs text-slate-400 font-medium">Kết thúc:</div>
                  <div className="font-semibold text-slate-800">
                    {formatLocalTime(auction.endTime)}
                  </div>
                </div>
              </div>
            </div>

            {/* View Product Details Link */}
            {auction.productId && (
              <div className="pt-2">
                <Link
                  to={`/products/${auction.productId}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition"
                >
                  <span>Xem trang thông tin chi tiết sản phẩm</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Pricing & Live Bidding Panel */}
        <div className="lg:col-span-5 space-y-6">
          {/* Main Price Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
            {/* Header: Phase Countdown or Ended Status */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                {isActive
                  ? 'Thời gian còn lại'
                  : isPending
                  ? 'Thời gian mở phiên'
                  : 'Trạng thái phiên'}
              </div>

              <div>
                {isActive && (
                  <CountdownTimer
                    targetTime={auction.endTime}
                    size="md"
                    onZero={handleCountdownZero}
                  />
                )}
                {isPending && (
                  <CountdownTimer
                    targetTime={auction.startTime}
                    size="md"
                    onZero={handleCountdownZero}
                  />
                )}
                {isEnded && (
                  <span className="text-xs font-bold text-slate-600 px-2.5 py-1 bg-slate-100 rounded-full">
                    Phiên đã kết thúc
                  </span>
                )}
                {isInitializing && (
                  <span className="text-xs font-bold text-sky-700 px-2.5 py-1 bg-sky-100 rounded-full flex items-center gap-1.5">
                    <RefreshCw className="h-3 w-3 animate-spin text-sky-600" />
                    Đang khởi tạo
                  </span>
                )}
              </div>
            </div>

            {/* Pricing Matrix */}
            <div className="space-y-4">
              {/* Current Price Highlight with Socket animation */}
              <div
                className={`p-4 sm:p-5 rounded-2xl border transition-all duration-300 ${
                  isPriceUpdated
                    ? 'bg-emerald-50 border-emerald-400 ring-2 ring-emerald-400/40 shadow-md'
                    : 'bg-gradient-to-br from-indigo-50/70 via-white to-slate-50 border-indigo-100/80'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-1">
                  <span>{isEnded ? 'Giá chốt phiên (Final Price)' : 'Giá hiện tại'}</span>
                  {isPriceUpdated && (
                    <span className="inline-flex items-center gap-1 text-2xs font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full animate-bounce">
                      <Sparkles className="h-3 w-3 text-emerald-600" />
                      Vừa có giá mới!
                    </span>
                  )}
                </div>
                <div className="flex items-baseline gap-2">
                  <span
                    className={`text-2xl sm:text-3xl font-black transition-colors ${
                      isPriceUpdated ? 'text-emerald-700' : 'text-indigo-600'
                    }`}
                  >
                    {formatVnd(
                      isEnded
                        ? auction.finalPrice ?? auction.currentPrice ?? '0'
                        : auction.currentPrice ?? '0'
                    )}
                  </span>
                </div>
              </div>

              {/* Starting Price & Bid Increment */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="text-2xs text-slate-400 font-medium">Giá khởi điểm</div>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {formatVnd(auction.startingPrice ?? '0')}
                  </div>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl">
                  <div className="text-2xs text-slate-400 font-medium">Bước giá tối thiểu</div>
                  <div className="font-bold text-slate-800 mt-0.5 flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                    +{formatVnd(auction.bidIncrement ?? '0')}
                  </div>
                </div>
              </div>
            </div>

            {/* Leading Bidder Indicator Banner */}
            <div className="pt-2">
              {isLeading && !isEnded && (
                <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800">
                  <div className="p-1.5 bg-emerald-500 text-white rounded-lg">
                    <UserCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold">Bạn đang dẫn đầu!</div>
                    <div className="text-2xs text-emerald-700">
                      Lượt đặt giá của bạn hiện có mức giá cao nhất.
                    </div>
                  </div>
                </div>
              )}

              {!isLeading && effectiveLeadingBidderId && !isEnded && (
                <div className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500" />
                    <span>Người đang dẫn đầu:</span>
                  </div>
                  <span className="font-bold text-slate-800">
                    {maskBidderId(effectiveLeadingBidderId, currentUser?.id)}
                  </span>
                </div>
              )}

              {!effectiveLeadingBidderId && !isEnded && (
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs text-slate-500 text-center">
                  Chưa có lượt đặt giá nào. Giá hiện tại bằng giá khởi điểm.
                </div>
              )}

              {/* Ended Results */}
              {isEnded && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">Người thắng cuộc:</span>
                    <span className="font-bold text-slate-900 flex items-center gap-1">
                      <ShieldCheck className="h-4 w-4 text-emerald-600" />
                      {auction.winnerId
                        ? maskBidderId(auction.winnerId, currentUser?.id)
                        : 'Không có (Không ai đặt giá)'}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-200/60">
                    <span className="text-slate-500">Giá chiến thắng:</span>
                    <span className="font-extrabold text-slate-900 text-sm">
                      {formatVnd(auction.finalPrice ?? auction.currentPrice ?? '0')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Realtime Bid Box (WEB-AUC-02) */}
          <BidBox
            auction={auction}
            latestBidderId={effectiveLeadingBidderId}
            totalBids={bidsPage?.total ?? (latestBid ? 1 : 0)}
            onBidSuccess={() => {
              void refetchAuction();
              void refetchBids();
            }}
            onOutbidRefetch={() => {
              void refetchAuction();
              void refetchBids();
            }}
          />
        </div>
      </div>

      {/* Bid History Section */}
      <div className="pt-4">
        <BidHistoryList
          auctionId={auction.id}
          currentUserId={currentUser?.id}
          isEnded={isEnded}
          winnerId={auction.winnerId}
        />
      </div>
    </div>
  );
};
