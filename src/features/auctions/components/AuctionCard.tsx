import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Auction } from '@/contracts/api.generated';
import { AuctionStatusBadge } from './AuctionStatusBadge';
import { CountdownTimer } from './CountdownTimer';
import { formatVnd } from '@/lib/money';
import { Gavel, ArrowRight, ShieldCheck } from 'lucide-react';

export interface AuctionCardProps {
  auction: Auction;
}

export const DEFAULT_AUCTION_PLACEHOLDER =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="200" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>';

export const AuctionCard: React.FC<AuctionCardProps> = ({ auction }) => {
  const [imageError, setImageError] = useState(false);

  const displayImageSrc =
    !imageError && auction.productThumbnail
      ? auction.productThumbnail
      : DEFAULT_AUCTION_PLACEHOLDER;

  const isPending = auction.status === 'PENDING';
  const isActive = auction.status === 'ACTIVE';
  const isEnded = auction.status === 'ENDED';
  const isCancelled = auction.status === 'CANCELLED';

  return (
    <div className="group flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-200">
      {/* Thumbnail Container */}
      <Link
        to={`/auctions/${auction.id}`}
        className="relative block aspect-4/3 overflow-hidden bg-slate-100"
        tabIndex={-1}
      >
        <img
          key={displayImageSrc}
          src={displayImageSrc}
          alt={auction.productTitle ?? 'Phiên đấu giá'}
          loading="lazy"
          onError={() => setImageError(true)}
          className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Status Badge overlay on image */}
        <div className="absolute top-3 left-3">
          <AuctionStatusBadge status={auction.status} size="sm" />
        </div>

        {/* Live indicator if active */}
        {isActive && (
          <div className="absolute top-3 right-3 bg-red-600/90 backdrop-blur-xs text-white text-3xs uppercase font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-white animate-ping" />
            LIVE
          </div>
        )}
      </Link>

      {/* Card Body */}
      <div className="flex flex-col flex-1 p-4 sm:p-5">
        {/* Title */}
        <Link
          to={`/auctions/${auction.id}`}
          className="group-hover:text-indigo-600 transition-colors"
        >
          <h2
            className="text-sm sm:text-base font-bold text-slate-900 line-clamp-2 leading-snug"
            title={auction.productTitle ?? 'Sản phẩm đấu giá'}
          >
            {auction.productTitle ?? 'Chưa có tiêu đề'}
          </h2>
        </Link>

        {/* Pricing Info */}
        <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-slate-500">Giá hiện tại:</span>
            <span className="text-base font-extrabold text-indigo-600">
              {formatVnd(auction.currentPrice ?? '0')}
            </span>
          </div>

          <div className="flex items-center justify-between text-2xs text-slate-400">
            <span>Khởi điểm: {formatVnd(auction.startingPrice ?? '0')}</span>
            <span>+Bước: {formatVnd(auction.bidIncrement ?? '0')}</span>
          </div>
        </div>

        {/* Countdown / Phase Status */}
        <div className="mt-3 p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
          {isActive && (
            <div className="flex items-center justify-between">
              <span className="text-2xs font-medium text-slate-500">Còn lại:</span>
              <CountdownTimer targetTime={auction.endTime} size="sm" />
            </div>
          )}

          {isPending && (
            <div className="flex items-center justify-between">
              <span className="text-2xs font-medium text-slate-500">Mở sau:</span>
              <CountdownTimer targetTime={auction.startTime} size="sm" />
            </div>
          )}

          {isEnded && (
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="text-2xs font-medium text-slate-500">Kết quả:</span>
              <span className="font-semibold text-slate-800 flex items-center gap-1">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                {auction.winnerId ? 'Đã có người thắng' : 'Kết thúc (Không có bid)'}
              </span>
            </div>
          )}

          {isCancelled && (
            <div className="text-2xs text-red-600 font-medium text-center">
              Phiên đã bị hủy
            </div>
          )}
        </div>

        {/* Action Button */}
        <div className="mt-4 pt-2">
          <Link
            to={`/auctions/${auction.id}`}
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-900 text-white text-xs font-semibold group-hover:bg-indigo-600 transition-colors shadow-xs"
          >
            <Gavel className="h-3.5 w-3.5" />
            <span>{isActive ? 'Vào phòng đấu giá' : 'Xem chi tiết'}</span>
            <ArrowRight className="h-3.5 w-3.5 ml-auto group-hover:translate-x-0.5 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
};
