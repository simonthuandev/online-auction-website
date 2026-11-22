import { authApi } from '../../../api/auth.api.ts';
import { tokenStorage } from '../../../lib/tokenStorage.ts';
import { store } from '../../../store/index.ts';
import { logout } from '../../../store/authSlice.ts';
import { disconnectSockets } from '../../../lib/socket.ts';
import { queryClient } from '../../../lib/queryClient.ts';

export interface PerformLogoutOptions {
  /**
   * Whether to call POST /api/auth/logout with refreshToken.
   * Default: true. Set to false when already rejected due to 401 or invalid session.
   */
  callApi?: boolean;
  /**
   * Optional user-facing reason (e.g. "Tài khoản đã bị khóa").
   * Passed to the login page via navigation state / URL param.
   */
  reason?: string;
  /**
   * Whether to redirect to login page. Default: true.
   */
  redirect?: boolean;
  /**
   * Destination path for redirect. Default: '/login'.
   */
  redirectTo?: string;
}

let isLoggingOut = false;

export type NavigateFn = (
  to: string,
  options?: { state?: Record<string, unknown>; replace?: boolean }
) => void;

let globalNavigate: NavigateFn | null = null;

/**
 * Register a router navigate function so logout can perform clean client-side navigation.
 */
export function registerLogoutNavigate(fn: NavigateFn): void {
  globalNavigate = fn;
}

/**
 * Centralized, idempotent logout handler.
 *
 * Sequence:
 * 1. Checks mutex lock to avoid duplicate or recursive logout calls.
 * 2. Takes stored refreshToken and calls POST /api/auth/logout (ignoring errors if any).
 * 3. Clears tokenStorage (access, refresh tokens, user cache).
 * 4. Clears Redux auth state.
 * 5. Disconnects both sockets (auctionSocket & notifSocket).
 * 6. Clears TanStack Query cache (queryClient.clear()).
 * 7. Redirects to /login (with optional reason message).
 */
export async function performLogout(options?: PerformLogoutOptions): Promise<void> {
  if (isLoggingOut) {
    return;
  }
  isLoggingOut = true;

  try {
    const refreshToken = tokenStorage.getRefreshToken();
    if (refreshToken && options?.callApi !== false) {
      try {
        await authApi.logout({ refreshToken });
      } catch (err) {
        // Even if logout API fails (e.g. 401, network offline, token revoked), continue cleanup
        console.warn('POST /api/auth/logout failed or was unauthorized; proceeding with local cleanup:', err);
      }
    }
  } finally {
    // 1. Clear local storage
    tokenStorage.clear();

    // 2. Clear Redux store
    store.dispatch(logout());

    // 3. Disconnect sockets
    disconnectSockets();

    // 4. Clear Query cache
    queryClient.clear();

    isLoggingOut = false;

    // 5. Redirect cleanly
    if (options?.redirect !== false) {
      const targetPath = options?.redirectTo || '/login';
      const state = options?.reason ? { message: options.reason } : undefined;

      if (globalNavigate) {
        globalNavigate(targetPath, { state, replace: true });
      } else if (typeof window !== 'undefined') {
        const url = new URL(targetPath, window.location.origin);
        if (options?.reason) {
          url.searchParams.set('message', options.reason);
        }
        window.location.replace(url.toString());
      }
    }
  }
}
