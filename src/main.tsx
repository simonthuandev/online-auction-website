import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { store } from '@/store';
import { setTokens, logout } from '@/store/authSlice';
import { setAuthCallbacks } from '@/api/client';
import {
  setQueryClientForSockets,
  updateSocketAuthToken,
  disconnectSockets,
  connectSockets,
} from '@/lib/socket';
import { tokenStorage } from '@/lib/tokenStorage';
import App from './App';
import './index.css';

// 1. Initialize TanStack Query client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 30, // 30s
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// 2. Wire QueryClient with Sockets for reconnect invalidation
setQueryClientForSockets(queryClient);

// 3. Wire single-flight refresh callbacks with Redux & Sockets
setAuthCallbacks({
  onTokenRefreshed: (accessToken, refreshToken) => {
    store.dispatch(setTokens({ accessToken, refreshToken }));
    updateSocketAuthToken(accessToken);
  },
  onAuthFailure: () => {
    store.dispatch(logout());
    disconnectSockets();
  },
});

// 4. Auto-connect sockets if an existing session token is stored
const existingToken = tokenStorage.getAccessToken();
if (existingToken) {
  connectSockets(existingToken);
}

// 5. Mount React Root
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </Provider>
  </StrictMode>
);
