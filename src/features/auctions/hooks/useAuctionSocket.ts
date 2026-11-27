import { useEffect, useRef, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  getAuctionSocket,
  subscribeAuctionRoom,
  unsubscribeAuctionRoom,
  type AuctionBidUpdatedPayload,
  type AuctionStatusChangedPayload,
} from '@/lib/socket';
import { AUCTION_QUERY_KEYS } from './useAuctions';
import type { Auction } from '@/contracts/api.generated';

export interface UseAuctionSocketOptions {
  auctionId?: string;
  currentVersion?: number;
  enabled?: boolean;
  onBidUpdated?: (payload: AuctionBidUpdatedPayload) => void;
  onStatusChanged?: (payload: AuctionStatusChangedPayload) => void;
}

export interface UseAuctionSocketReturn {
  isConnected: boolean;
  isSubscribed: boolean;
  isPriceUpdated: boolean;
  latestBidderId: string | null;
  latestBidAmount: string | null;
  subscribe: () => Promise<void>;
}

/**
 * Custom hook to connect to the /auctions socket namespace, subscribe to an auction room,
 * filter events by version (payload.version > current.version), and keep TanStack Query in sync.
 */
export function useAuctionSocket({
  auctionId,
  currentVersion = 0,
  enabled = true,
  onBidUpdated,
  onStatusChanged,
}: UseAuctionSocketOptions): UseAuctionSocketReturn {
  const queryClient = useQueryClient();
  const socket = getAuctionSocket();

  const [isConnected, setIsConnected] = useState<boolean>(() => socket.connected);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isPriceUpdated, setIsPriceUpdated] = useState<boolean>(false);
  const [latestBidderId, setLatestBidderId] = useState<string | null>(null);
  const [latestBidAmount, setLatestBidAmount] = useState<string | null>(null);

  // Keep track of latest known version to prevent stale out-of-order socket packets
  const versionRef = useRef<number>(currentVersion);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Synchronize version when prop changes
  useEffect(() => {
    if (currentVersion > versionRef.current) {
      versionRef.current = currentVersion;
    }
  }, [currentVersion]);

  const subscribe = useCallback(async () => {
    if (!auctionId || !enabled) return;
    try {
      const ack = await subscribeAuctionRoom(auctionId);
      setIsSubscribed(Boolean(ack?.ok));
    } catch (err) {
      console.warn(`Failed to subscribe to auction:${auctionId}:`, err);
      setIsSubscribed(false);
    }
  }, [auctionId, enabled]);

  useEffect(() => {
    if (!auctionId || !enabled) return;

    let isMounted = true;

    const joinRoom = () => {
      subscribeAuctionRoom(auctionId)
        .then((ack) => {
          if (isMounted && ack?.ok) {
            setIsSubscribed(true);
          }
        })
        .catch((err) => {
          if (isMounted) {
            console.warn(`Failed to subscribe to auction:${auctionId}:`, err);
            setIsSubscribed(false);
          }
        });
    };

    // 1. Initial subscribe asynchronously
    joinRoom();

    // 2. Track connection state
    const handleConnect = () => {
      setIsConnected(true);
      joinRoom();
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setIsSubscribed(false);
    };

    // On reconnect: invalidate queries and re-subscribe
    const handleReconnect = () => {
      console.log(`⚡ Reconnected socket for auction:${auctionId}. Re-subscribing and invalidating...`);
      void queryClient.invalidateQueries({
        queryKey: AUCTION_QUERY_KEYS.detail(auctionId),
      });
      void queryClient.invalidateQueries({
        queryKey: AUCTION_QUERY_KEYS.bids(auctionId),
      });
      joinRoom();
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.io.on('reconnect', handleReconnect);

    // 3. Handle auction:bid_updated (new bid placed)
    const handleBidUpdated = (payload: AuctionBidUpdatedPayload) => {
      if (!payload || payload.auctionId !== auctionId) return;

      // Backend Rule: Only update UI when incoming version > current known version
      if (typeof payload.version === 'number' && payload.version <= versionRef.current) {
        console.warn(
          `Ignoring out-of-order bid event (version ${payload.version} <= current ${versionRef.current})`
        );
        return;
      }

      if (typeof payload.version === 'number') {
        versionRef.current = payload.version;
      }

      setLatestBidderId(payload.bidderId);
      setLatestBidAmount(payload.amount);

      // Trigger visual highlight for 2.5 seconds
      setIsPriceUpdated(true);
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
      highlightTimeoutRef.current = setTimeout(() => {
        setIsPriceUpdated(false);
      }, 2500);

      // Update TanStack Query detail cache with new price and version
      queryClient.setQueryData<Auction>(
        AUCTION_QUERY_KEYS.detail(auctionId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            currentPrice: payload.amount,
            version: payload.version ?? old.version,
          };
        }
      );

      // Invalidate bids cache so the new bid appears at top of bid history
      void queryClient.invalidateQueries({
        queryKey: AUCTION_QUERY_KEYS.bids(auctionId),
      });

      onBidUpdated?.(payload);
    };

    // 4. Handle auction:status_changed (PENDING -> ACTIVE or ACTIVE -> ENDED)
    const handleStatusChanged = (payload: AuctionStatusChangedPayload) => {
      if (!payload || payload.auctionId !== auctionId) return;

      // Rule: version check
      if (typeof payload.version === 'number' && payload.version <= versionRef.current) {
        console.warn(
          `Ignoring out-of-order status event (version ${payload.version} <= current ${versionRef.current})`
        );
        return;
      }

      if (typeof payload.version === 'number') {
        versionRef.current = payload.version;
      }

      // Update TanStack Query detail cache with new status
      queryClient.setQueryData<Auction>(
        AUCTION_QUERY_KEYS.detail(auctionId),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            status: payload.status,
            version: payload.version ?? old.version,
            winnerId: payload.winnerId !== undefined ? payload.winnerId : old.winnerId,
            finalPrice: payload.finalPrice !== undefined ? payload.finalPrice : old.finalPrice,
          };
        }
      );

      // Invalidate queries to ensure full synchronization with backend
      void queryClient.invalidateQueries({
        queryKey: AUCTION_QUERY_KEYS.detail(auctionId),
      });
      void queryClient.invalidateQueries({
        queryKey: AUCTION_QUERY_KEYS.bids(auctionId),
      });

      onStatusChanged?.(payload);
    };

    socket.on('auction:bid_updated', handleBidUpdated);
    socket.on('auction:status_changed', handleStatusChanged);

    // 5. Cleanup on unmount or when auctionId changes
    return () => {
      isMounted = false;
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.io.off('reconnect', handleReconnect);
      socket.off('auction:bid_updated', handleBidUpdated);
      socket.off('auction:status_changed', handleStatusChanged);
      unsubscribeAuctionRoom(auctionId);
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, [auctionId, enabled, queryClient, socket, subscribe, onBidUpdated, onStatusChanged]);

  return {
    isConnected,
    isSubscribed,
    isPriceUpdated,
    latestBidderId,
    latestBidAmount,
    subscribe,
  };
}
