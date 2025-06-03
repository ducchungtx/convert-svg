import api from '../lib/api';

export interface NotificationSettings {
  emailNotifications: boolean;
  conversionComplete: boolean;
  weeklyReport: boolean;
  securityAlerts: boolean;
}

export class UserService {
  /**
   * Lấy cài đặt thông báo
   */
  static async getNotificationSettings(): Promise<NotificationSettings> {
    try {
      const response = await api.get('/user/notifications');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching notification settings:', error);
      // Return default settings if API fails
      return {
        emailNotifications: true,
        conversionComplete: true,
        weeklyReport: false,
        securityAlerts: true,
      };
    }
  }

  /**
   * Cập nhật cài đặt thông báo
   */
  static async updateNotificationSettings(settings: NotificationSettings): Promise<void> {
    try {
      await api.put('/user/notifications', settings);
    } catch (error) {
      console.error('Error updating notification settings:', error);
      throw new Error('Failed to update notification settings');
    }
  }

  /**
   * Lấy thống kê sử dụng
   */
  static async getUsageStats() {
    try {
      const response = await api.get('/user/stats');
      return response.data.data;
    } catch (error) {
      console.error('Error fetching usage stats:', error);
      throw new Error('Failed to fetch usage statistics');
    }
  }

  /**
   * Lấy lịch sử chuyển đổi
   */
  static async getConversionHistory(page = 1, limit = 10) {
    try {
      const response = await api.get('/user/conversions', {
        params: { page, limit }
      });
      return response.data.data;
    } catch (error) {
      console.error('Error fetching conversion history:', error);
      throw new Error('Failed to fetch conversion history');
    }
  }
}
