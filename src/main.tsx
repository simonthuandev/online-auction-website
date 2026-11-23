import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { store } from '@/store';
import { setTokens } from '@/store/authSlice';
import { setAuthCallbacks } from '@/api/client';
import { performLogout } from '@/features/auth/services/performLogout';
import {
  setQueryClientForSockets,
  updateSocketAuthToken,
  connectSockets,
} from '@/lib/socket';
import { tokenStorage } from '@/lib/tokenStorage';
import App from './App';
import './index.css';

// 1. Wire QueryClient with Sockets for reconnect invalidation
setQueryClientForSockets(queryClient);

// 2. Wire single-flight refresh callbacks with Redux & Sockets
setAuthCallbacks({
  onTokenRefreshed: (accessToken, refreshToken) => {
    store.dispatch(setTokens({ accessToken, refreshToken }));
    updateSocketAuthToken(accessToken);
  },
  onAuthFailure: (reason) => {
    performLogout({
      callApi: false,
      reason: reason || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.',
    });
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
