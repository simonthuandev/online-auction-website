import React, { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { Auction, Bid } from '@/contracts/api.generated';
import { useAppSelector } from '@/store';
import { auctionApi } from '@/api/auction.api';
import { formatVnd, compareVnd, isValidVnd } from '@/lib/money';
import { isPast } from '@/lib/time';
import { generateIdempotencyKey } from '@/lib/idempotency';
import {
  calculateMinimumBid,
  calculateQuickSteps,
} from '../utils/auctionHelpers';
import {
  Gavel,
  Lock,
  UserCheck,
  AlertCircle,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  LogIn,
  Info,
} from 'lucide-react';

export interface BidBoxProps {
  auction: Auction;
  latestBidderId?: string | null;
  totalBids?: number;
  onBidSuccess?: (bid: Bid) => void;
  onOutbidRefetch?: () => void;
  className?: string;
}

export const BidBox: React.FC<BidBoxProps> = ({
  auction,
  latestBidderId,
  totalBids = 0,
  onBidSuccess,
  onOutbidRefetch,
  className = '',
}) => {
  const currentUser = useAppSelector((state) => state.auth.user);

  const hasBids = totalBids > 0;
  const minBidAmount = useMemo(
    () =>
      calculateMinimumBid(
        auction.startingPrice ?? '0',
        auction.currentPrice ?? '0',
        auction.bidIncrement ?? '0',
        hasBids
      ),
    [auction.startingPrice, auction.currentPrice, auction.bidIncrement, hasBids]
  );

  const quickSteps = useMemo(
    () =>
      calculateQuickSteps(
        auction.startingPrice ?? '0',
        auction.currentPrice ?? '0',
        auction.bidIncrement ?? '0',
        hasBids
      ),
    [auction.startingPrice, auction.currentPrice, auction.bidIncrement, hasBids]
  );

  // Form input state
  const [amountInput, setAmountInput] = useState<string>(minBidAmount);
  const [prevMinBid, setPrevMinBid] = useState<string>(minBidAmount);

  // If the current price jumps (via socket or refetch), adjust amount input if lower than new min
  if (minBidAmount !== prevMinBid) {
    setPrevMinBid(minBidAmount);
    if (!amountInput || compareVnd(amountInput, minBidAmount) < 0) {
      setAmountInput(minBidAmount);
    }
  }

  // Idempotency key state:
  // Maintained across retries on network error; reset on value change or success
  const [idempotencyKey, setIdempotencyKey] = useState<string>(() => generateIdempotencyKey());

  // Mutation and submission states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Handle amount change: generate a new idempotency key whenever amount is altered
  const handleAmountChange = (newAmount: string) => {
    // Only accept numeric digits
    const cleaned = newAmount.replace(/\D/g, '');
    setAmountInput(cleaned);
    setErrorMessage(null);
    setSuccessMessage(null);
    setIdempotencyKey(generateIdempotencyKey());
  };

  const handleQuickStepSelect = (stepAmount: string) => {
    setAmountInput(stepAmount);
    setErrorMessage(null);
    setSuccessMessage(null);
    setIdempotencyKey(generateIdempotencyKey());
  };

  // Rule constraints:
  const isGuest = !currentUser;
  const isSeller = Boolean(currentUser?.id && auction.sellerId === currentUser.id);
  const isLeading = Boolean(
    currentUser?.id && latestBidderId && latestBidderId === currentUser.id
  );
  const isActive = auction.status === 'ACTIVE';
  const isExpired = isPast(auction.endTime);

  const isFormLocked = isGuest || isSeller || isLeading || !isActive || isExpired;

  // Submit Bid handler
  const handleSubmitBid = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isFormLocked || isSubmitting) return;

      // 1. Client-side validations
      if (!isValidVnd(amountInput)) {
        setErrorMessage('Vui lòng nhập số tiền hợp lệ (số nguyên VND lớn hơn 0).');
        return;
      }

      if (compareVnd(amountInput, minBidAmount) < 0) {
        setErrorMessage(
          `Mức giá đặt phải tối thiểu là ${formatVnd(minBidAmount)}.`
        );
        return;
      }

      setIsSubmitting(true);
      setErrorMessage(null);
      setSuccessMessage(null);

      try {
        const newBid = await auctionApi.placeBid(
          auction.id,
          amountInput,
          idempotencyKey
        );

        setSuccessMessage(`Đặt giá thành công: ${formatVnd(newBid.amount)}!`);
        // Generate new idempotency key for next bid
        setIdempotencyKey(generateIdempotencyKey());

        // Notify parent callbacks
        onBidSuccess?.(newBid);
      } catch (err: unknown) {
        // Detailed Axios error inspection
        const axiosError = err as {
          response?: { status?: number; data?: { code?: string; message?: string } };
          message?: string;
        };
        const status = axiosError.response?.status;
        const beMessage = axiosError.response?.data?.message;

        if (status === 400) {
          setErrorMessage(
            beMessage ||
              `Mức giá đặt không hợp lệ hoặc thấp hơn mức tối thiểu (${formatVnd(
                minBidAmount
              )}).`
          );
        } else if (status === 403) {
          setErrorMessage(
            beMessage || 'Bạn là người bán của phiên đấu giá này, không thể tự đặt giá.'
          );
        } else if (status === 409) {
          setErrorMessage(
            beMessage ||
              'Có người đã đặt giá cao hơn hoặc phiên đã thay đổi. Đang tải giá mới nhất...'
          );
          // Auto-trigger refetch on 409 conflict
          onOutbidRefetch?.();
        } else {
          setErrorMessage(
            beMessage ||
              axiosError.message ||
              'Không thể kết nối đến máy chủ. Vui lòng bấm thử lại.'
          );
          // Note: On network/timeout error, keep the same idempotencyKey for safe retry
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [
      isFormLocked,
      isSubmitting,
      amountInput,
      minBidAmount,
      auction.id,
      idempotencyKey,
      onBidSuccess,
      onOutbidRefetch,
    ]
  );

  return (
    <div
      className={`bg-white border border-slate-200 rounded-3xl p-5 sm:p-6 shadow-xs space-y-4 ${className}`}
    >
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
            <Gavel className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Đặt giá đấu</h3>
            <p className="text-2xs text-slate-500">Mức tối thiểu: {formatVnd(minBidAmount)}</p>
          </div>
        </div>

        {isActive && !isExpired && (
          <span className="text-3xs font-extrabold uppercase px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
            Sẵn sàng
          </span>
        )}
      </div>

      {/* Guest Mode Notice */}
      {isGuest && (
        <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-2xl text-center space-y-2">
          <p className="text-xs text-amber-800">
            Bạn cần đăng nhập tài khoản để tham gia đặt giá phiên này.
          </p>
          <Link
            to={`/login?redirect=/auctions/${auction.id}`}
            className="inline-flex items-center justify-center gap-1.5 w-full py-2 px-4 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition shadow-xs"
          >
            <LogIn className="h-3.5 w-3.5" />
            <span>Đăng nhập để đặt giá</span>
          </Link>
        </div>
      )}

      {/* Seller Lock Notice */}
      {!isGuest && isSeller && (
        <div className="flex items-center gap-2.5 p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-600 text-xs">
          <Lock className="h-4 w-4 text-slate-400 shrink-0" />
          <span>Bạn là người bán phiên đấu giá này (không thể tự đặt giá).</span>
        </div>
      )}

      {/* Leading Bidder Lock Notice */}
      {!isGuest && !isSeller && isLeading && (
        <div className="flex items-center gap-2.5 p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs">
          <UserCheck className="h-4 w-4 text-emerald-600 shrink-0" />
          <div>
            <div className="font-bold">Bạn đang dẫn đầu phiên!</div>
            <div className="text-2xs text-emerald-700">
              Chưa thể đặt giá tiếp cho đến khi có người khác trả giá cao hơn.
            </div>
          </div>
        </div>
      )}

      {/* Non-Active or Expired Notice */}
      {!isGuest && !isSeller && (!isActive || isExpired) && (
        <div className="flex items-center gap-2.5 p-3.5 bg-slate-100 border border-slate-200 rounded-2xl text-slate-600 text-xs">
          <Info className="h-4 w-4 text-slate-400 shrink-0" />
          <span>
            {auction.status === 'PENDING'
              ? 'Phiên đấu giá chưa mở. Vui lòng chờ đến giờ mở phiên.'
              : 'Phiên đấu giá đã kết thúc hoặc đã bị hủy.'}
          </span>
        </div>
      )}

      {/* Interactive Bidding Form (when allowed) */}
      {!isFormLocked && (
        <form onSubmit={handleSubmitBid} className="space-y-4">
          {/* Quick Increment Buttons */}
          <div className="space-y-1.5">
            <div className="text-2xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-indigo-500" />
              Chọn nhanh mức giá:
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickStepSelect(quickSteps.step1)}
                disabled={isSubmitting}
                className={`py-2 px-2 text-xs font-bold rounded-xl border transition ${
                  amountInput === quickSteps.step1
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs ring-1 ring-indigo-500/20'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                +1 bước
                <span className="block text-3xs font-normal text-slate-500 mt-0.5">
                  {formatVnd(quickSteps.step1)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickStepSelect(quickSteps.step2)}
                disabled={isSubmitting}
                className={`py-2 px-2 text-xs font-bold rounded-xl border transition ${
                  amountInput === quickSteps.step2
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs ring-1 ring-indigo-500/20'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                +2 bước
                <span className="block text-3xs font-normal text-slate-500 mt-0.5">
                  {formatVnd(quickSteps.step2)}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleQuickStepSelect(quickSteps.step5)}
                disabled={isSubmitting}
                className={`py-2 px-2 text-xs font-bold rounded-xl border transition ${
                  amountInput === quickSteps.step5
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-2xs ring-1 ring-indigo-500/20'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                +5 bước
                <span className="block text-3xs font-normal text-slate-500 mt-0.5">
                  {formatVnd(quickSteps.step5)}
                </span>
              </button>
            </div>
          </div>

          {/* Custom Amount Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="bid-amount-input"
              className="text-xs font-semibold text-slate-700 flex items-center justify-between"
            >
              <span>Số tiền muốn đặt (VND):</span>
              <span className="text-2xs font-normal text-slate-400">
                Hiển thị: {formatVnd(amountInput || '0')}
              </span>
            </label>
            <div className="relative">
              <input
                id="bid-amount-input"
                type="text"
                inputMode="numeric"
                value={amountInput}
                onChange={(e) => handleAmountChange(e.target.value)}
                disabled={isSubmitting}
                placeholder={minBidAmount}
                className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-mono font-bold text-slate-900 focus:outline-hidden focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 disabled:opacity-50 transition"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                ₫
              </span>
            </div>
          </div>

          {/* Feedback messages */}
          {errorMessage && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {successMessage && (
            <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Submit Button (Anti double-click) */}
          <button
            type="submit"
            disabled={isSubmitting || !amountInput}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 active:bg-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-xs"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Đang xử lý đặt giá...</span>
              </>
            ) : (
              <>
                <Gavel className="h-4 w-4" />
                <span>Xác nhận đặt giá {formatVnd(amountInput || '0')}</span>
              </>
            )}
          </button>
        </form>
      )}
    </div>
  );
};
