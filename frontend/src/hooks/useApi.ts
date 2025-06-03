import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface UseApiOptions {
  showSuccessToast?: boolean;
  showErrorToast?: boolean;
  successMessage?: string;
}

interface UseApiReturn<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (...args: unknown[]) => Promise<T | void>;
  reset: () => void;
}

/**
 * Custom hook để xử lý API calls với loading state và error handling
 */
export function useApi<T = unknown>(
  apiFunction: (...args: unknown[]) => Promise<T>,
  options: UseApiOptions = {}
): UseApiReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    showSuccessToast = false,
    showErrorToast = true,
    successMessage = 'Operation completed successfully'
  } = options;

  const execute = useCallback(async (...args: unknown[]) => {
    try {
      setLoading(true);
      setError(null);

      const result = await apiFunction(...args);
      setData(result);

      if (showSuccessToast) {
        toast.success(successMessage);
      }

      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);

      if (showErrorToast) {
        toast.error(errorMessage);
      }

      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiFunction, showSuccessToast, showErrorToast, successMessage]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return {
    data,
    loading,
    error,
    execute,
    reset,
  };
}

/**
 * Hook cho profile data với auto-refresh
 */
export function useProfileData() {
  const [profileData, setProfileData] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const { AuthService } = await import('@/services');
      const data = await AuthService.getProfile();
      setProfileData(data);
      return data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    profileData,
    loading,
    fetchProfile,
    setProfileData,
  };
}
