import { apiClient } from './client.ts';
import type {
  User,
  Tokens,
  operations,
} from '../contracts/api.generated.ts';

export type RegisterInput =
  operations['auth_post__api_auth_register']['requestBody']['content']['application/json'];

export type LoginInput =
  operations['auth_post__api_auth_login']['requestBody']['content']['application/json'];

export type LogoutInput =
  operations['auth_post__api_auth_logout']['requestBody']['content']['application/json'];

export type UpdateProfileInput =
  operations['auth_patch__api_auth_me']['requestBody']['content']['application/json'];

export const authApi = {
  /**
   * Log in with email and password.
   * Calls POST /api/auth/login. Returns access and refresh tokens.
   */
  async login(data: LoginInput): Promise<Tokens> {
    const res = await apiClient.post<Tokens>('/api/auth/login', data);
    return res.data;
  },

  /**
   * Register a new user account.
   * Calls POST /api/auth/register. Returns created User model.
   */
  async register(data: RegisterInput): Promise<User> {
    const res = await apiClient.post<User>('/api/auth/register', data);
    return res.data;
  },

  /**
   * Fetch current authenticated user profile.
   * Calls GET /api/auth/me.
   */
  async getMe(): Promise<User> {
    const res = await apiClient.get<User>('/api/auth/me');
    return res.data;
  },

  /**
   * Update profile (name, avatarUrl).
   * Calls PATCH /api/auth/me.
   */
  async updateMe(data: UpdateProfileInput): Promise<User> {
    const res = await apiClient.patch<User>('/api/auth/me', data);
    return res.data;
  },

  /**
   * Log out current session by revoking the refresh token.
   * Calls POST /api/auth/logout with { refreshToken }.
   */
  async logout(data: LogoutInput): Promise<{ revoked: boolean }> {
    const res = await apiClient.post<{ revoked: boolean }>('/api/auth/logout', data);
    return res.data;
  },
};
