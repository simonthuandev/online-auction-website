import { apiClient } from './client.ts';
import type {
  Auction,
  AuctionPage,
  Bid,
  BidPage,
  AuctionStatus,
} from '../contracts/api.generated.ts';

export interface PlaceBidInput {
  amount: string;
}

export interface AuctionListParams {
  page?: number;
  pageSize?: number;
  categoryId?: string;
  status?: AuctionStatus | string;
  search?: string;
}

export interface BidListParams {
  page?: number;
  pageSize?: number;
  categoryId?: string;
  status?: string;
  search?: string;
}

export const auctionApi = {
  /**
   * Fetch paginated list of public auctions with optional filters.
   * Calls GET /api/auctions.
   */
  async getAuctions(params?: AuctionListParams): Promise<AuctionPage> {
    const res = await apiClient.get<AuctionPage>('/api/auctions', {
      params,
    });
    return res.data;
  },

  /**
   * Fetch single auction details by ID.
   * Calls GET /api/auctions/{id}.
   */
  async getAuction(id: string): Promise<Auction> {
    const res = await apiClient.get<Auction>(`/api/auctions/${id}`);
    return res.data;
  },

  /**
   * Fetch paginated bid history for an auction (newest first).
   * Calls GET /api/auctions/{id}/bids.
   */
  async getAuctionBids(id: string, params?: BidListParams): Promise<BidPage> {
    const res = await apiClient.get<BidPage>(`/api/auctions/${id}/bids`, {
      params,
    });
    return res.data;
  },

  /**
   * Place a new bid on an active auction.
   * Calls POST /api/auctions/{id}/bids with Idempotency-Key header.
   */
  async placeBid(
    id: string,
    amount: string,
    idempotencyKey: string
  ): Promise<Bid> {
    const res = await apiClient.post<Bid>(
      `/api/auctions/${id}/bids`,
      { amount },
      {
        headers: {
          'Idempotency-Key': idempotencyKey,
        },
      }
    );
    return res.data;
  },
};
