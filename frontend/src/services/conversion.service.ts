import api from '../lib/api';

// Declare global window interface extension
declare global {
  interface Window {
    __pendingRequests?: {
      [key: string]: Promise<unknown>;
    };
  }
}

// Local types để tránh dependency issues
interface ConversionFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  createdAt: string;
  updatedAt: string;
}

interface ConversionHistory {
  id: string;
  files: ConversionFile[];
  status: string;
  createdAt: string;
  completedAt?: string;
}

export interface ConversionOptions {
  format: 'png' | 'jpg' | 'pdf' | 'webp';
  quality?: number;
  width?: number;
  height?: number;
  backgroundColor?: string;
}

export class ConversionService {
  /**
   * Upload và chuyển đổi file SVG
   */
  static async convertFiles(files: File[], options: ConversionOptions): Promise<ConversionHistory> {
    try {
      const formData = new FormData();

      // Add files to form data
      files.forEach((file) => {
        formData.append('files', file);
      });

      // Add conversion options
      formData.append('options', JSON.stringify(options));

      // Invalidate any cached conversion history when we start a new conversion
      if (typeof window !== 'undefined') {
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith('conversion_history_')) {
            sessionStorage.removeItem(key);
          }
        });
      }

      const response = await api.post('/conversions/convert', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data.data;
    } catch (error: unknown) {
      console.error('Error converting files:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response: { status: number, statusText: string, data?: { message?: string } } };
        const errorMessage = axiosError.response.data?.message || axiosError.response.statusText;
        throw new Error(`Failed to convert files: ${errorMessage}`);
      }
      throw new Error('Failed to convert files: Network error');
    }
  }

  /**
   * Lấy lịch sử chuyển đổi với caching tối ưu
   */
  static async getConversionHistory(page = 1, limit = 10) {
    console.log('ConversionService.getConversionHistory called with:', { page, limit });

    try {
      // Thêm cache key để tránh gọi lại API không cần thiết khi chuyển trang
      const cacheKey = `conversion_history_${page}_${limit}`;
      console.log('Using cache key:', cacheKey);

      // Kiểm tra xem có đang có request đang chạy không
      const pendingRequestKey = `pending_${cacheKey}`;

      // Khởi tạo window.__pendingRequests nếu chưa có
      if (typeof window !== 'undefined') {
        if (!window.__pendingRequests) {
          window.__pendingRequests = {};
        }

        const pendingRequest = window.__pendingRequests[pendingRequestKey];
        if (pendingRequest) {
          console.log('Returning existing pending request');
          return pendingRequest;
        }
      }

      // Sử dụng cache trong session storage
      if (typeof window !== 'undefined') {
        const cachedData = sessionStorage.getItem(cacheKey);
        if (cachedData) {
          console.log('Found cached data, checking if valid...');
          try {
            const parsed = JSON.parse(cachedData);
            // Cache có hiệu lực trong 2 phút - tăng thời gian cache để giảm số lần gọi API
            if (Date.now() - parsed.timestamp < 120000) {
              console.log('Using valid cached data');
              return parsed.data;
            } else {
              console.log('Cache expired, will make new request');
            }
          } catch {
            console.log('Cache parse error, removing invalid cache');
            // Nếu parse lỗi, xóa cache để tạo mới
            sessionStorage.removeItem(cacheKey);
          }
        } else {
          console.log('No cached data found');
        }
      }

      console.log('Making API request to /conversion/history...');

      // Tạo request mới và xử lý trong trường hợp browser environment
      if (typeof window !== 'undefined' && window.__pendingRequests) {
        window.__pendingRequests[pendingRequestKey] = (async () => {
          try {
            console.log('Executing API call with params:', { page, limit });
            const response = await api.get('/conversion/history', {
              params: { page, limit }
            });

            console.log('API response received:', response);
            const data = response.data.data;
            console.log('Extracted data from response:', data);

            // Lưu vào cache với timestamp
            sessionStorage.setItem(cacheKey, JSON.stringify({
              data,
              timestamp: Date.now()
            }));
            console.log('Data cached successfully');

            return data;
          } finally {
            console.log('Cleaning up pending request');
            // Xóa pending request
            if (window.__pendingRequests) {
              delete window.__pendingRequests[pendingRequestKey];
            }
          }
        })();

        return window.__pendingRequests[pendingRequestKey] as Promise<ConversionHistory>;
      } else {
        console.log('Fallback: making direct API call (non-browser environment)');
        // Fallback for non-browser environment
        const response = await api.get('/conversion/history', {
          params: { page, limit }
        });
        console.log('Fallback API response:', response);
        return response.data.data;
      }
    } catch (error: unknown) {
      console.error('Error in ConversionService.getConversionHistory:', error);
      // Thêm thông tin chi tiết hơn về lỗi
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response: { status: number, statusText: string } };
        const errorMsg = `Failed to fetch conversion history: ${axiosError.response.status} ${axiosError.response.statusText}`;
        console.error('Axios error details:', errorMsg);
        throw new Error(errorMsg);
      }
      const networkError = 'Failed to fetch conversion history: Network error';
      console.error('Network error:', networkError);
      throw new Error(networkError);
    }
  }

  /**
   * Lấy chi tiết một conversion với caching
   */
  static async getConversionDetail(conversionId: string): Promise<ConversionHistory> {
    try {
      // Cache key cho chi tiết conversion
      const cacheKey = `conversion_detail_${conversionId}`;

      if (typeof window !== 'undefined') {
        // Create pending request tracking
        if (!window.__pendingRequests) {
          window.__pendingRequests = {};
        }

        const pendingRequestKey = `pending_${cacheKey}`;
        const pendingRequest = window.__pendingRequests[pendingRequestKey];
        if (pendingRequest !== undefined) {
          return pendingRequest as Promise<ConversionHistory>;
        }

        // Check cache first
        const cachedData = sessionStorage.getItem(cacheKey);
        if (cachedData) {
          try {
            const parsed = JSON.parse(cachedData);
            // Cache có hiệu lực trong 1 phút
            if (Date.now() - parsed.timestamp < 60000) {
              return parsed.data;
            }
          } catch {
            // Xóa cache nếu parse lỗi
            sessionStorage.removeItem(cacheKey);
          }
        }

        // Create a new request and cache it
        window.__pendingRequests[pendingRequestKey] = (async () => {
          try {
            const response = await api.get(`/conversions/${conversionId}`);
            const data = response.data.data;

            // Cache the result
            sessionStorage.setItem(cacheKey, JSON.stringify({
              data,
              timestamp: Date.now()
            }));

            return data;
          } finally {
            if (window.__pendingRequests) {
              delete window.__pendingRequests[pendingRequestKey];
            }
          }
        })();

        return window.__pendingRequests[pendingRequestKey] as Promise<ConversionHistory>;
      } else {
        // Fallback for non-browser environment
        const response = await api.get(`/conversions/${conversionId}`);
        return response.data.data;
      }
    } catch (error: unknown) {
      console.error('Error fetching conversion detail:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response: { status: number, statusText: string } };
        throw new Error(`Failed to fetch conversion detail: ${axiosError.response.status} ${axiosError.response.statusText}`);
      }
      throw new Error('Failed to fetch conversion detail: Network error');
    }
  }

  /**
   * Download file đã chuyển đổi với caching
   */
  static async downloadFile(fileId: string): Promise<Blob> {
    try {
      // Kiểm tra cache cho downloads
      const cacheKey = `download_file_${fileId}`;

      if (typeof window !== 'undefined') {
        // Create pending request tracking
        if (!window.__pendingRequests) {
          window.__pendingRequests = {};
        }

        const pendingRequestKey = `pending_${cacheKey}`;
        const pendingRequest = window.__pendingRequests[pendingRequestKey];
        if (pendingRequest !== undefined) {
          return pendingRequest as Promise<Blob>;
        }

        // Create a new request and cache it
        window.__pendingRequests[pendingRequestKey] = (async () => {
          try {
            const response = await api.get(`/conversion/download/${fileId}`, {
              responseType: 'blob'
            });
            return response.data;
          } finally {
            if (window.__pendingRequests) {
              delete window.__pendingRequests[pendingRequestKey];
            }
          }
        })();

        return window.__pendingRequests[pendingRequestKey] as Promise<Blob>;
      } else {
        // Fallback for non-browser environment
        const response = await api.get(`/conversion/download/${fileId}`, {
          responseType: 'blob'
        });
        return response.data;
      }
    } catch (error: unknown) {
      console.error('Error downloading file:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response: { status: number, statusText: string } };
        throw new Error(`Failed to download file: ${axiosError.response.status} ${axiosError.response.statusText}`);
      }
      throw new Error('Failed to download file: Network error');
    }
  }

  /**
   * Xóa conversion với cache invalidation
   */
  static async deleteConversion(conversionId: string): Promise<void> {
    try {
      await api.delete(`/conversion/${conversionId}`);

      // Xóa tất cả cache liên quan đến history để đảm bảo dữ liệu được cập nhật
      if (typeof window !== 'undefined') {
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith('conversion_history_')) {
            sessionStorage.removeItem(key);
          }
        });
      }
    } catch (error: unknown) {
      console.error('Error deleting conversion:', error);
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response: { status: number, statusText: string } };
        throw new Error(`Failed to delete conversion: ${axiosError.response.status} ${axiosError.response.statusText}`);
      }
      throw new Error('Failed to delete conversion: Network error');
    }
  }

  /**
   * Retry failed conversion
   */
  static async retryConversion(conversionId: string): Promise<ConversionHistory> {
    try {
      const response = await api.post(`/conversions/${conversionId}/retry`);
      return response.data.data;
    } catch (error) {
      console.error('Error retrying conversion:', error);
      throw new Error('Failed to retry conversion');
    }
  }

  /**
   * Cancel pending/processing conversion
   */
  static async cancelConversion(conversionId: string): Promise<void> {
    try {
      await api.post(`/conversions/${conversionId}/cancel`);
    } catch (error) {
      console.error('Error canceling conversion:', error);
      throw new Error('Failed to cancel conversion');
    }
  }
}
