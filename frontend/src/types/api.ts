// API Response interfaces based on backend structure
export interface ApiUser {
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

export interface ApiStats {
  totalConversions: number;
  completedConversions: number;
  failedConversions: number;
  pendingConversions: number;
  processingConversions: number;
}

export interface ApiSubscription {
  type: string;
  status: string;
  startDate: string | null;
  endDate: string | null;
  daysRemaining: number | null;
  isExpired: boolean;
}

export interface ApiUsage {
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
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data: T;
  message?: string;
}

export interface ProfileData {
  user: ApiUser;
  stats: ApiStats;
  subscription: ApiSubscription;
  usage: ApiUsage;
}

// Conversion related types
export interface ConversionFile {
  id: string;
  name: string;
  size: number;
  type: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ConversionHistory {
  id: string;
  files: ConversionFile[];
  status: string;
  createdAt: string;
  completedAt?: string;
}
