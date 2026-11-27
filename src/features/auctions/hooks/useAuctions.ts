import {
  useQuery,
  useMutation,
  useQueryClient,
  keepPreviousData,
} from '@tanstack/react-query';
import {
  auctionApi,
  type AuctionListParams,
  type BidListParams,
  type CreateAuctionInput,
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
    refetchInterval: (query) => {
      // WEB-AUC-03 Rule: When status === 'INITIALIZING', auto poll every 2s
      // Stops polling when transitioning to PENDING, ACTIVE, or CANCELLED
      const status = query.state.data?.status;
      if (status === 'INITIALIZING') {
        return 2000;
      }
      return false;
    },
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

/**
 * Mutation hook to create a new auction.
 * Returns 202 Accepted with status INITIALIZING.
 */
export function useCreateAuction() {
  const queryClient = useQueryClient();

  return useMutation<
    Auction,
    Error,
    { input: CreateAuctionInput; idempotencyKey: string }
  >({
    mutationFn: async ({ input, idempotencyKey }) => {
      return await auctionApi.createAuction(input, idempotencyKey);
    },
    onSuccess: (newAuction) => {
      queryClient.setQueryData(
        AUCTION_QUERY_KEYS.detail(newAuction.id),
        newAuction
      );
      void queryClient.invalidateQueries({
        queryKey: AUCTION_QUERY_KEYS.lists(),
      });
    },
  });
}
