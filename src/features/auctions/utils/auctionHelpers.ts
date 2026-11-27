import type { AuctionStatus } from '../../../contracts/api.generated.ts';
import { addVnd, multiplyVnd } from '../../../lib/money.ts';

export const PUBLIC_AUCTION_STATUSES = ['ACTIVE', 'PENDING', 'ENDED'] as const;
export type PublicAuctionStatus = (typeof PUBLIC_AUCTION_STATUSES)[number];

export interface AuctionFilterState {
  page: number;
  pageSize: number;
  status?: PublicAuctionStatus;
  search?: string;
}

/**
 * Parse and sanitize URL search parameters into valid AuctionFilterState.
 * Prevents invalid/negative page numbers, out-of-range page sizes, and malformed statuses.
 */
export function parseAuctionFilters(searchParams: URLSearchParams): AuctionFilterState {
  // 1. Page parsing (1..1,000,000, fallback 1)
  const rawPage = parseInt(searchParams.get('page') || '1', 10);
  const page = !isNaN(rawPage) && rawPage > 0 ? rawPage : 1;

  // 2. PageSize parsing (1..100, default 12)
  const rawPageSize = parseInt(searchParams.get('pageSize') || '12', 10);
  const pageSize = !isNaN(rawPageSize) && rawPageSize > 0 && rawPageSize <= 100 ? rawPageSize : 12;

  // 3. Status parsing (strictly filter to ACTIVE, PENDING, ENDED)
  const rawStatus = searchParams.get('status')?.trim().toUpperCase();
  const status =
    rawStatus && (PUBLIC_AUCTION_STATUSES as readonly string[]).includes(rawStatus)
      ? (rawStatus as PublicAuctionStatus)
      : undefined;

  // 4. Search query parsing (trimmed string, undefined if empty)
  const rawSearch = searchParams.get('search')?.trim();
  const search = rawSearch && rawSearch.length > 0 ? rawSearch : undefined;

  return {
    page,
    pageSize,
    status,
    search,
  };
}

/**
 * Convert AuctionFilterState into a URLSearchParams instance, omitting defaults to keep URLs clean.
 */
export function buildAuctionFilterParams(filters: AuctionFilterState): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.page > 1) {
    params.set('page', filters.page.toString());
  }

  if (filters.pageSize !== 12) {
    params.set('pageSize', filters.pageSize.toString());
  }

  if (filters.status) {
    params.set('status', filters.status);
  }

  if (filters.search) {
    params.set('search', filters.search);
  }

  return params;
}

export interface AuctionStatusMeta {
  label: string;
  badgeClass: string;
  dotClass: string;
}

/**
 * Get human-readable labels, styles and badge tokens for each auction status.
 */
export function getAuctionStatusMeta(status?: AuctionStatus): AuctionStatusMeta {
  switch (status) {
    case 'ACTIVE':
      return {
        label: 'Đang diễn ra',
        badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 ring-emerald-500/20',
        dotClass: 'bg-emerald-500 animate-pulse',
      };
    case 'PENDING':
      return {
        label: 'Sắp mở',
        badgeClass: 'bg-amber-50 text-amber-700 border-amber-200/80 ring-amber-500/20',
        dotClass: 'bg-amber-500',
      };
    case 'ENDED':
      return {
        label: 'Đã kết thúc',
        badgeClass: 'bg-slate-100 text-slate-700 border-slate-300 ring-slate-400/20',
        dotClass: 'bg-slate-500',
      };
    case 'CANCELLED':
      return {
        label: 'Đã hủy',
        badgeClass: 'bg-red-50 text-red-700 border-red-200/80 ring-red-500/20',
        dotClass: 'bg-red-500',
      };
    case 'INITIALIZING':
      return {
        label: 'Đang khởi tạo',
        badgeClass: 'bg-sky-50 text-sky-700 border-sky-200/80 ring-sky-500/20',
        dotClass: 'bg-sky-500 animate-pulse',
      };
    default:
      return {
        label: status ?? 'Chưa xác định',
        badgeClass: 'bg-slate-100 text-slate-600 border-slate-200 ring-slate-400/20',
        dotClass: 'bg-slate-400',
      };
  }
}

/**
 * Mask a user ID for public display, e.g. "usr-***-a1b2".
 * If current user, returns "Bạn".
 */
export function maskBidderId(
  bidderId: string | null | undefined,
  currentUserId?: string | null
): string {
  if (!bidderId) return 'Ẩn danh';
  if (currentUserId && bidderId === currentUserId) {
    return 'Bạn';
  }

  if (bidderId.length <= 8) {
    return `Người dùng #${bidderId}`;
  }

  const prefix = bidderId.slice(0, 4);
  const suffix = bidderId.slice(-4);
  return `${prefix}...${suffix}`;
}

/**
 * Checks if the current user is leading the auction based on the latest bid.
 */
export function isUserLeadingBidder(
  latestBidderId?: string | null,
  currentUserId?: string | null
): boolean {
  if (!latestBidderId || !currentUserId) return false;
  return latestBidderId === currentUserId;
}

/**
 * Calculates the strict minimum bid allowed per backend business logic:
 * - If 0 bids have been placed: min = startingPrice
 * - If >= 1 bids have been placed: min = currentPrice + bidIncrement
 */
export function calculateMinimumBid(
  startingPrice: string,
  currentPrice: string,
  bidIncrement: string,
  hasBids: boolean
): string {
  if (!hasBids) {
    return startingPrice;
  }
  return addVnd(currentPrice, bidIncrement);
}

/**
 * Calculates quick-step target amounts (+1, +2, +5 steps).
 */
export function calculateQuickSteps(
  startingPrice: string,
  currentPrice: string,
  bidIncrement: string,
  hasBids: boolean
): { step1: string; step2: string; step5: string } {
  if (!hasBids) {
    return {
      step1: startingPrice,
      step2: addVnd(startingPrice, multiplyVnd(bidIncrement, 1)),
      step5: addVnd(startingPrice, multiplyVnd(bidIncrement, 4)),
    };
  }
  return {
    step1: addVnd(currentPrice, multiplyVnd(bidIncrement, 1)),
    step2: addVnd(currentPrice, multiplyVnd(bidIncrement, 2)),
    step5: addVnd(currentPrice, multiplyVnd(bidIncrement, 5)),
  };
}
