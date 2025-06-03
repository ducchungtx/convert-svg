import api from '../lib/api';

export interface ProfileUpdateData {
  name: string;
}

export interface PasswordChangeData {
  currentPassword: string;
  newPassword: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
}

// Local types để tránh dependency issues
interface ApiUser {
  id: number;
  email: string;
  name: string;
  image: string | null;
  role: string;
  subscriptionType: string;
  subscriptionStatus: string;
  subscriptionStart: string | null;
  subscriptionEnd: string | null;
  dailyLimit: number;
  monthlyLimit: number;
  usedToday: number;
  usedThisMonth: number;
  isActive: boolean;
  lastLoginAt: string;
  createdAt: string;
  updatedAt: string;
}

interface ProfileData {
  user: ApiUser;
  stats: {
    totalConversions: number;
    completedConversions: number;
    failedConversions: number;
    pendingConversions: number;
    processingConversions: number;
  };
  subscription: {
    type: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    daysRemaining: number | null;
    isExpired: boolean;
  };
  usage: {
    daily: {
      used: number;
      limit: number;
      remaining: number;
      percentage: number;
    };
    monthly: {
      used: number;
      limit: number;
      remaining: number;
      percentage: number;
    };
  };
}

export class AuthService {
  // Cache for profile data to prevent duplicate API calls
  private static profileCache: ProfileData | null = null;
  private static profileCacheTime = 0;
  private static readonly PROFILE_CACHE_DURATION = 10000; // 10 seconds
  private static profilePromise: Promise<ProfileData> | null = null;

  /**
   * Lấy thông tin profile của user hiện tại
   */
  static async getProfile(): Promise<ProfileData> {
    const now = Date.now();

    // Return cached data if still valid
    if (this.profileCache && (now - this.profileCacheTime < this.PROFILE_CACHE_DURATION)) {
      return this.profileCache;
    }

    // If there's already a pending request, return that promise
    if (this.profilePromise) {
      return this.profilePromise;
    }

    // Create new request
    this.profilePromise = this.fetchProfile();

    try {
      const result = await this.profilePromise;
      this.profileCache = result;
      this.profileCacheTime = now;
      return result;
    } finally {
      this.profilePromise = null;
    }
  }

  private static async fetchProfile(): Promise<ProfileData> {
    try {
      const response = await api.get('/auth/profile');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw new Error('Failed to fetch profile data');
    }
  }

  /**
   * Clear profile cache (call this after profile updates)
   */
  static clearProfileCache(): void {
    this.profileCache = null;
    this.profileCacheTime = 0;
    this.profilePromise = null;
  }

  /**
   * Cập nhật thông tin profile
   */
  static async updateProfile(data: ProfileUpdateData): Promise<ApiUser> {
    try {
      const response = await api.put('/auth/profile', data);
      // Clear cache after update to ensure fresh data on next fetch
      this.clearProfileCache();
      return response.data.data.user;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw new Error('Failed to update profile');
    }
  }

  /**
   * Thay đổi mật khẩu
   */
  static async changePassword(data: PasswordChangeData): Promise<void> {
    try {
      await api.put('/auth/password', data);
    } catch (error) {
      console.error('Error changing password:', error);
      throw new Error('Failed to change password');
    }
  }

  /**
   * Đăng nhập (cho trường hợp cần gọi API backend trực tiếp)
   */
  static async login(credentials: LoginCredentials) {
    try {
      const response = await api.post('/auth/login', credentials);
      return response.data;
    } catch (error) {
      console.error('Error logging in:', error);
      throw new Error('Failed to login');
    }
  }

  /**
   * Đăng ký (cho trường hợp cần gọi API backend trực tiếp)
   */
  static async register(data: RegisterData) {
    try {
      const response = await api.post('/auth/register', data);
      return response.data;
    } catch (error) {
      console.error('Error registering:', error);
      throw new Error('Failed to register');
    }
  }

  /**
   * Xóa tài khoản
   */
  static async deleteAccount(): Promise<void> {
    try {
      await api.delete('/auth/account');
    } catch (error) {
      console.error('Error deleting account:', error);
      throw new Error('Failed to delete account');
    }
  }

  /**
   * Xuất dữ liệu người dùng
   */
  static async exportUserData(): Promise<Blob> {
    try {
      const response = await api.get('/auth/export', {
        responseType: 'blob'
      });
      return response.data;
    } catch (error) {
      console.error('Error exporting user data:', error);
      throw new Error('Failed to export user data');
    }
  }
}
