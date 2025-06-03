import axios, { AxiosError, AxiosRequestConfig } from 'axios';
import { getSession } from 'next-auth/react';
import { config } from './config';

// Define a more specific error type for Axios errors
export interface ApiError extends Error {
  response?: {
    status: number;
    statusText: string;
    data?: {
      message?: string;
      errors?: Record<string, string[]>;
    };
  };
  code?: string;
  config?: AxiosRequestConfig;
  validationErrors?: Record<string, string[]>;
  isApiError: boolean;
}

// Helper function to create ApiError objects
export function createApiError(error: unknown): ApiError {
  if (error instanceof Error) {
    const apiError = error as Partial<ApiError>;
    return {
      ...apiError,
      isApiError: true,
    } as ApiError;
  }

  return {
    name: 'ApiError',
    message: String(error),
    isApiError: true,
  } as ApiError;
}

// Create axios instance with improved configuration
const api = axios.create({
  baseURL: config.api.baseUrl,
  timeout: config.api.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Cache session to avoid repeated getSession calls
let cachedSession: { accessToken?: string } | null = null;
let sessionCacheTime = 0;
const SESSION_CACHE_DURATION = 30000; // 30 seconds
let pendingSessionPromise: Promise<{ accessToken?: string } | null> | null = null;

// Request interceptor để thêm auth token
api.interceptors.request.use(
  async (config) => {
    try {
      const now = Date.now();

      // Check if we need to refresh the session
      // Nếu không có cache hoặc cache đã hết hạn
      if (!cachedSession || (now - sessionCacheTime > SESSION_CACHE_DURATION)) {
        try {
          // Chỉ tạo một promise request nếu chưa có
          if (!pendingSessionPromise) {
            pendingSessionPromise = getSession();
          }

          // Đợi và sử dụng kết quả từ promise được share giữa các request
          cachedSession = await pendingSessionPromise;
          sessionCacheTime = now;
        } catch (error) {
          console.warn('Error getting session:', error);
        } finally {
          // Reset promise dù thành công hay thất bại
          pendingSessionPromise = null;
        }
      }

      // Log the session data for debugging
      console.log('API interceptor - cached session:', {
        hasSession: !!cachedSession,
        hasAccessToken: !!cachedSession?.accessToken,
        sessionKeys: cachedSession ? Object.keys(cachedSession) : []
      });

      if (cachedSession?.accessToken) {
        config.headers.Authorization = `Bearer ${cachedSession.accessToken}`;
        console.log('Using NextAuth session token');
      } else if (typeof window !== 'undefined') {
        // Fallback to localStorage token (for custom auth)
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
          console.log('Using localStorage token');
        } else {
          console.log('No authentication token found');
        }
      }
    } catch (error) {
      console.warn('Failed to get session for API request:', error);
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor với error handling và retry logic
api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
    const apiError = createApiError(error);

    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (typeof window !== 'undefined') {
        // Clear stored tokens
        localStorage.removeItem('token');

        // Also clear session-related caches
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith('conversion_') || key.startsWith('user_')) {
            sessionStorage.removeItem(key);
          }
        });

        // Redirect to login page
        window.location.href = '/login';
      }

      return Promise.reject(apiError);
    }

    // Handle 403 Forbidden (insufficient permissions)
    if (error.response?.status === 403) {
      const errorData = error.response.data as { message?: string };
      console.error('Access denied:', errorData?.message);
      apiError.message = 'You do not have permission to perform this action';
      return Promise.reject(apiError);
    }

    // Handle 422 Validation errors
    if (error.response?.status === 422) {
      const errorData = error.response.data as { errors?: Record<string, string[]> };
      const validationErrors = errorData?.errors || {};
      apiError.validationErrors = validationErrors;
      apiError.message = 'Validation failed';
      return Promise.reject(apiError);
    }

    // Handle 429 Rate limiting
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      apiError.message = `Too many requests. Please try again ${retryAfter ? `after ${retryAfter} seconds` : 'later'}.`;
      return Promise.reject(apiError);
    }

    // Handle 500+ Server errors with retry logic
    if (error.response?.status && error.response.status >= 500 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Wait 1 second before retry
      await new Promise(resolve => setTimeout(resolve, 1000));

      try {
        return await api(originalRequest);
      } catch (retryError) {
        console.error('Retry failed:', retryError);
      }
    }

    // Handle network errors
    if (!error.response && error.code === 'ERR_NETWORK') {
      apiError.message = 'Network error. Please check your internet connection.';
      return Promise.reject(apiError);
    }

    // Handle timeout errors
    if (error.code === 'ECONNABORTED') {
      apiError.message = 'Request timeout. Please try again.';
      return Promise.reject(apiError);
    }

    // Default error handling
    if (error.response?.data && typeof error.response.data === 'object') {
      const errorData = error.response.data as { message?: string };
      apiError.message = errorData?.message || apiError.message;
    }

    return Promise.reject(apiError);
  }
);

export default api;
