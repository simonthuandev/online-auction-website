/**
 * Web Token Storage Helper using localStorage.
 * Centralized place for reading, writing, and clearing auth tokens.
 */

const ACCESS_TOKEN_KEY = 'oa_access_token';
const REFRESH_TOKEN_KEY = 'oa_refresh_token';
const USER_KEY = 'oa_user_data';

export const tokenStorage = {
  getAccessToken(): string | null {
    try {
      return localStorage.getItem(ACCESS_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  getRefreshToken(): string | null {
    try {
      return localStorage.getItem(REFRESH_TOKEN_KEY);
    } catch {
      return null;
    }
  },

  setTokens(tokens: { accessToken: string; refreshToken?: string | null }): void {
    try {
      if (tokens.accessToken) {
        localStorage.setItem(ACCESS_TOKEN_KEY, tokens.accessToken);
      }
      if (tokens.refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);
      }
    } catch (err) {
      console.warn('Failed to save tokens to localStorage', err);
    }
  },

  getUser<T = unknown>(): T | null {
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setUser<T = unknown>(user: T | null): void {
    try {
      if (user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } else {
        localStorage.removeItem(USER_KEY);
      }
    } catch (err) {
      console.warn('Failed to save user to localStorage', err);
    }
  },

  clear(): void {
    try {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    } catch (err) {
      console.warn('Failed to clear tokens from localStorage', err);
    }
  },
};
