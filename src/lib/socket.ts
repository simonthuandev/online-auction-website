import { io, type Socket } from 'socket.io-client';
import type { QueryClient } from '@tanstack/react-query';
import { tokenStorage } from './tokenStorage.ts';
import type {
  AuctionBidUpdatedPayload,
  AuctionStatusChangedPayload,
  AuctionSubscribeAck,
  Notification as NotificationModel,
} from '../contracts/api.generated.ts';

export const SOCKET_AUCTION_URL: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SOCKET_AUCTION_URL) ||
  'http://localhost:3003/auctions';
export const SOCKET_NOTIF_URL: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SOCKET_NOTIF_URL) ||
  'http://localhost:3006/notifications';

let auctionSocket: Socket | null = null;
let notifSocket: Socket | null = null;
let queryClientRef: QueryClient | null = null;

/**
 * Configure TanStack QueryClient instance for cache invalidation on socket reconnect.
 */
export function setQueryClientForSockets(queryClient: QueryClient): void {
  queryClientRef = queryClient;
}

/**
 * Common socket connection options based on contracts/socket.json.
 */
function createSocketOptions(token?: string | null) {
  const authToken = token ?? tokenStorage.getAccessToken();
  return {
    transports: ['websocket'],
    autoConnect: false,
    auth: authToken ? { token: authToken } : {},
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  };
}

/**
 * Get or create the singleton Socket instance for the /auctions namespace.
 */
export function getAuctionSocket(token?: string | null): Socket {
  if (!auctionSocket) {
    auctionSocket = io(SOCKET_AUCTION_URL, createSocketOptions(token));

    auctionSocket.on('connect', () => {
      console.log('⚡ Connected to Auction Socket:', SOCKET_AUCTION_URL);
    });

    auctionSocket.on('connect_error', (err) => {
      console.warn('⚠️ Auction Socket connection error:', err.message);
    });

    // On reconnect: invalidate auction queries so REST data re-syncs
    auctionSocket.io.on('reconnect', (attempt) => {
      console.log(`🔄 Auction Socket reconnected (attempt ${attempt}). Invalidating queries...`);
      queryClientRef?.invalidateQueries({ queryKey: ['auctions'] });
    });
  } else if (token !== undefined) {
    auctionSocket.auth = token ? { token } : {};
  }

  return auctionSocket;
}

/**
 * Get or create the singleton Socket instance for the /notifications namespace.
 */
export function getNotifSocket(token?: string | null): Socket {
  if (!notifSocket) {
    notifSocket = io(SOCKET_NOTIF_URL, createSocketOptions(token));

    notifSocket.on('connect', () => {
      console.log('🔔 Connected to Notification Socket:', SOCKET_NOTIF_URL);
    });

    notifSocket.on('connect_error', (err) => {
      console.warn('⚠️ Notification Socket connection error:', err.message);
    });

    // On reconnect: invalidate notification queries
    notifSocket.io.on('reconnect', (attempt) => {
      console.log(`🔄 Notification Socket reconnected (attempt ${attempt}). Invalidating queries...`);
      queryClientRef?.invalidateQueries({ queryKey: ['notifications'] });
    });
  } else if (token !== undefined) {
    notifSocket.auth = token ? { token } : {};
  }

  return notifSocket;
}

/**
 * Connect both auction and notification sockets using the provided or stored token.
 */
export function connectSockets(token?: string | null): void {
  const effectiveToken = token ?? tokenStorage.getAccessToken();

  const aSock = getAuctionSocket(effectiveToken);
  if (!aSock.connected) {
    aSock.connect();
  }

  // Only connect notification socket if user is authenticated (authenticated room user:{sub})
  if (effectiveToken) {
    const nSock = getNotifSocket(effectiveToken);
    if (!nSock.connected) {
      nSock.connect();
    }
  }
}

/**
 * Update the auth token on existing sockets and reconnect if necessary.
 */
export function updateSocketAuthToken(token: string | null): void {
  if (auctionSocket) {
    auctionSocket.auth = token ? { token } : {};
    if (auctionSocket.connected) {
      // Re-establish connection with new auth credentials
      auctionSocket.disconnect().connect();
    }
  }

  if (notifSocket) {
    notifSocket.auth = token ? { token } : {};
    if (token) {
      if (!notifSocket.connected) {
        notifSocket.connect();
      } else {
        notifSocket.disconnect().connect();
      }
    } else {
      notifSocket.disconnect();
    }
  }
}

/**
 * Disconnect both socket singletons and remove listeners.
 */
export function disconnectSockets(): void {
  if (auctionSocket) {
    auctionSocket.disconnect();
  }
  if (notifSocket) {
    notifSocket.disconnect();
  }
}

/**
 * Helper to subscribe to an auction room with server acknowledgement.
 */
export function subscribeAuctionRoom(
  auctionId: string
): Promise<AuctionSubscribeAck> {
  const socket = getAuctionSocket();
  return new Promise((resolve, reject) => {
    if (!socket.connected) {
      socket.connect();
    }
    socket.emit('auction:subscribe', { auctionId }, (ack: AuctionSubscribeAck) => {
      if (ack?.ok) {
        resolve(ack);
      } else {
        reject(new Error(ack?.code || 'SUBSCRIBE_FAILED'));
      }
    });
  });
}

/**
 * Helper to unsubscribe from an auction room.
 */
export function unsubscribeAuctionRoom(auctionId: string): void {
  if (auctionSocket?.connected) {
    auctionSocket.emit('auction:unsubscribe', { auctionId });
  }
}

export type {
  AuctionBidUpdatedPayload,
  AuctionStatusChangedPayload,
  AuctionSubscribeAck,
  NotificationModel,
};
