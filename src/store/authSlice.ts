import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../contracts/api.generated.ts';
import { tokenStorage } from '../lib/tokenStorage.ts';

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const initialAccessToken = tokenStorage.getAccessToken();
const initialRefreshToken = tokenStorage.getRefreshToken();
const initialUser = tokenStorage.getUser<User>();

const initialState: AuthState = {
  user: initialUser,
  accessToken: initialAccessToken,
  refreshToken: initialRefreshToken,
  isAuthenticated: Boolean(initialAccessToken),
  isLoading: false,
};

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: User; accessToken: string; refreshToken: string }>
    ) => {
      const { user, accessToken, refreshToken } = action.payload;
      state.user = user;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.isAuthenticated = true;
      tokenStorage.setTokens({ accessToken, refreshToken });
      tokenStorage.setUser(user);
    },
    setTokens: (
      state,
      action: PayloadAction<{ accessToken: string; refreshToken?: string }>
    ) => {
      state.accessToken = action.payload.accessToken;
      if (action.payload.refreshToken) {
        state.refreshToken = action.payload.refreshToken;
      }
      state.isAuthenticated = true;
      tokenStorage.setTokens(action.payload);
    },
    setUser: (state, action: PayloadAction<User | null>) => {
      state.user = action.payload;
      tokenStorage.setUser(action.payload);
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.isLoading = false;
      tokenStorage.clear();
    },
  },
});

export const { setCredentials, setTokens, setUser, setLoading, logout } = authSlice.actions;
export default authSlice.reducer;
