import { QueryClient } from '@tanstack/react-query';

/**
 * Global TanStack QueryClient instance for caching server state.
 * Shared between components, socket listeners, and session managers.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30s
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

