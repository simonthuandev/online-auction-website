import { useQuery, keepPreviousData } from '@tanstack/react-query';
import {
  auctionApi,
  type AuctionListParams,
  type BidListParams,
} from '@/api/auction.api';
import type { Auction, AuctionPage, BidPage } from '@/contracts/api.generated';

export const AUCTION_QUERY_KEYS = {
  all: ['auctions'] as const,
  lists: () => [...AUCTION_QUERY_KEYS.all, 'list'] as const,
  list: (params?: AuctionListParams) =>
    [...AUCTION_QUERY_KEYS.lists(), params] as const,
  details: () => [...AUCTION_QUERY_KEYS.all, 'detail'] as const,
  detail: (id?: string) => [...AUCTION_QUERY_KEYS.details(), id] as const,
  bids: (id?: string, params?: BidListParams) =>
    [...AUCTION_QUERY_KEYS.detail(id), 'bids', params] as const,
};

/**
 * Hook to fetch paginated list of public auctions.
 */
export function useAuctions(params?: AuctionListParams) {
  return useQuery<AuctionPage, Error>({
    queryKey: AUCTION_QUERY_KEYS.list(params),
    queryFn: async () => {
      return await auctionApi.getAuctions(params);
    },
    placeholderData: keepPreviousData,
    staleTime: 1000 * 10, // 10 seconds
  });
}

/**
 * Hook to fetch single auction details by ID.
 */
export function useAuction(id?: string) {
  return useQuery<Auction, Error>({
    queryKey: AUCTION_QUERY_KEYS.detail(id),
    queryFn: async () => {
      if (!id) throw new Error('Auction ID is required');
      return await auctionApi.getAuction(id);
    },
    enabled: Boolean(id),
    staleTime: 1000 * 5, // 5 seconds
  });
}

/**
 * Hook to fetch paginated bid history for an auction.
 */
export function useAuctionBids(id?: string, params?: BidListParams) {
  return useQuery<BidPage, Error>({
    queryKey: AUCTION_QUERY_KEYS.bids(id, params),
    queryFn: async () => {
      if (!id) throw new Error('Auction ID is required');
      return await auctionApi.getAuctionBids(id, params);
    },
    enabled: Boolean(id),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 5, // 5 seconds
  });
}
