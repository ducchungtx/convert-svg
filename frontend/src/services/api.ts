/**
 * API wrapper để tập trung tất cả các API calls
 * Sử dụng axios instance đã được cấu hình với interceptors
 */

import { AuthService } from './auth.service';
import { UserService } from './user.service';
import { ConversionService } from './conversion.service';

// Centralized API object
const API = {
  auth: AuthService,
  user: UserService,
  conversion: ConversionService,
} as const;

// Re-export services
export { AuthService, UserService, ConversionService };

// Re-export types
export type {
  ProfileUpdateData,
  PasswordChangeData,
  LoginCredentials,
  RegisterData
} from './auth.service';

export type {
  NotificationSettings
} from './user.service';

export type {
  ConversionOptions
} from './conversion.service';

// Named export
export { API };

// Default export for convenience
export default API;
