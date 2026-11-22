import { useQuery, useMutation } from '@tanstack/react-query';
import { authApi, type LoginInput, type RegisterInput, type UpdateProfileInput } from '@/api/auth.api';
import { useAppDispatch } from '@/store';
import { setCredentials, setUser } from '@/store/authSlice';
import { tokenStorage } from '@/lib/tokenStorage';
import { connectSockets } from '@/lib/socket';
import { queryClient } from '@/lib/queryClient';
import { performLogout } from '../services/performLogout';
import type { User, Tokens } from '@/contracts/api.generated';

export const AUTH_QUERY_KEY = ['auth', 'me'] as const;

/**
 * Hook to retrieve and cache the current authenticated user profile.
 * Synchronizes with Redux store and detects inactive/locked accounts.
 */
export function useMe() {
  const dispatch = useAppDispatch();
  const hasToken = Boolean(tokenStorage.getAccessToken());

  return useQuery<User, Error>({
    queryKey: AUTH_QUERY_KEY,
    queryFn: async () => {
      const user = await authApi.getMe();
      if (user.isActive === false) {
        await performLogout({ reason: 'Tài khoản của bạn đã bị khóa hoặc không còn hoạt động' });
        throw new Error('Tài khoản đã bị khóa');
      }
      dispatch(setUser(user));
      return user;
    },
    enabled: hasToken,
    staleTime: 1000 * 60 * 5, // 5 mins cache
  });
}

/**
 * Hook to log in a user.
 * On success, fetches profile via GET /api/auth/me to verify status and role before proceeding.
 */
export function useLogin() {
  const dispatch = useAppDispatch();

  return useMutation<{ tokens: Tokens; user: User }, Error, LoginInput>({
    mutationFn: async (credentials: LoginInput) => {
      // 1. Authenticate with backend
      const tokens = await authApi.login(credentials);

      // 2. Temporarily persist tokens so subsequent getMe call has Authorization header
      tokenStorage.setTokens({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });

      // 3. Load user profile and role
      const user = await authApi.getMe();

      // 4. Verify account is active
      if (user.isActive === false) {
        await performLogout({
          callApi: false,
          reason: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.',
        });
        throw new Error('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.');
      }

      // 5. Commit credentials to Redux store
      dispatch(
        setCredentials({
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
        })
      );

      // 6. Connect sockets with active accessToken
      connectSockets(tokens.accessToken);

      // 7. Seed QueryClient cache
      queryClient.setQueryData(AUTH_QUERY_KEY, user);

      return { tokens, user };
    },
  });
}

/**
 * Hook to register a new account.
 * Per OpenAPI contract, returns User (does not issue tokens).
 */
export function useRegister() {
  return useMutation<User, Error, RegisterInput>({
    mutationFn: async (data: RegisterInput) => {
      return await authApi.register(data);
    },
  });
}

/**
 * Hook to update name and/or avatarUrl.
 * Synchronizes TanStack Query cache and Redux user state.
 */
export function useUpdateProfile() {
  const dispatch = useAppDispatch();

  return useMutation<User, Error, UpdateProfileInput>({
    mutationFn: async (data: UpdateProfileInput) => {
      return await authApi.updateMe(data);
    },
    onSuccess: (updatedUser) => {
      queryClient.setQueryData(AUTH_QUERY_KEY, updatedUser);
      dispatch(setUser(updatedUser));
    },
  });
}

