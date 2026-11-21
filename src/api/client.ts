import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { tokenStorage } from '../lib/tokenStorage.ts';
import type { ApiErrorEnvelope } from '../contracts/api.generated.ts';

export const API_BASE_URL: string =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  'http://localhost:8080';

/**
 * Standardized API Error class wrapping backend error envelope:
 * { code: string, message: string, requestId?: string }
 */
export class ApiError extends Error {
  code: string;
  statusCode?: number;
  requestId?: string;
  response?: unknown;

  constructor(
    message: string,
    code = 'UNKNOWN_ERROR',
    statusCode?: number,
    requestId?: string,
    response?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.statusCode = statusCode;
    this.requestId = requestId;
    this.response = response;
  }
}

// Callbacks for auth events (e.g., syncing Redux state, reconnecting sockets)
type TokenRefreshCallback = (accessToken: string, refreshToken?: string) => void;
type AuthFailureCallback = () => void;

let tokenRefreshedCallback: TokenRefreshCallback | null = null;
let authFailureCallback: AuthFailureCallback | null = null;

export function setAuthCallbacks(callbacks: {
  onTokenRefreshed?: TokenRefreshCallback;
  onAuthFailure?: AuthFailureCallback;
}) {
  if (callbacks.onTokenRefreshed) tokenRefreshedCallback = callbacks.onTokenRefreshed;
  if (callbacks.onAuthFailure) authFailureCallback = callbacks.onAuthFailure;
}

/**
 * Single-Flight Refresh Token Promise Lock (Mutex)
 * Ensures that when multiple parallel requests receive 401, only ONE request to
 * POST /api/auth/refresh is triggered. The remaining requests await the single promise.
 */
let refreshPromise: Promise<string> | null = null;

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request Interceptor: Attach Bearer token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = tokenStorage.getAccessToken();
    if (token && !config.headers.Authorization) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Single-flight refresh token on 401 + error normalization
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined;

    // Check if error is 401 Unauthorized
    if (error.response?.status === 401 && originalRequest) {
      // If this request was already a refresh call or was already retried, fail permanently
      const isRefreshRequest = originalRequest.url?.includes('/api/auth/refresh');
      if (isRefreshRequest || originalRequest._retry) {
        tokenStorage.clear();
        authFailureCallback?.();
        return Promise.reject(normalizeError(error));
      }

      originalRequest._retry = true;

      try {
        // If no refresh is in progress, initiate one
        if (!refreshPromise) {
          refreshPromise = (async () => {
            const currentRefreshToken = tokenStorage.getRefreshToken();
            if (!currentRefreshToken) {
              throw new Error('No refresh token available');
            }

            // Raw call via un-intercepted axios instance to avoid loops
            const refreshBaseUrl = apiClient.defaults.baseURL || API_BASE_URL;
            const { data } = await axios.post<{ accessToken: string; refreshToken?: string }>(
              `${refreshBaseUrl}/api/auth/refresh`,
              { refreshToken: currentRefreshToken },
              { headers: { 'Content-Type': 'application/json' } }
            );

            if (!data?.accessToken) {
              throw new Error('No access token returned from refresh');
            }

            // Update local storage
            tokenStorage.setTokens({
              accessToken: data.accessToken,
              refreshToken: data.refreshToken || currentRefreshToken,
            });

            // Trigger subscribers (e.g. Redux store, sockets)
            tokenRefreshedCallback?.(data.accessToken, data.refreshToken || currentRefreshToken);

            return data.accessToken;
          })().finally(() => {
            refreshPromise = null;
          });
        }

        // Wait for the single in-flight refresh promise to resolve
        const newAccessToken = await refreshPromise;

        // Replay original request with new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshErr) {
        tokenStorage.clear();
        authFailureCallback?.();
        return Promise.reject(normalizeError(refreshErr));
      }
    }

    return Promise.reject(normalizeError(error));
  }
);

/**
 * Normalizes backend error envelope into standard ApiError.
 */
function normalizeError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  if (axios.isAxiosError(error) && error.response?.data) {
    const data = error.response.data as ApiErrorEnvelope;
    const message = data.message || error.message || 'Yêu cầu không thành công';
    const code = data.code || `HTTP_${error.response.status}`;
    const requestId = data.requestId;

    const apiError = new ApiError(message, code, error.response.status, requestId, data);
    apiError.stack = error.stack;
    return apiError;
  }

  if (error instanceof Error) {
    return new ApiError(error.message, 'CLIENT_ERROR');
  }

  return new ApiError('Đã có lỗi xảy ra', 'UNKNOWN_ERROR');
}

export default apiClient;
