/**
 * Environment configuration for the frontend application
 */

const config = {
  // API Configuration
  api: {
    baseUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api',
    timeout: 30000,
  },

  // File Upload Configuration
  upload: {
    maxFileSize: parseInt(process.env.NEXT_PUBLIC_MAX_FILE_SIZE || '10485760'), // 10MB default
    allowedFormats: (process.env.NEXT_PUBLIC_ALLOWED_FORMATS || 'svg,png,jpg,jpeg,webp').split(','),
    maxFiles: 5,
  },

  // Authentication Configuration
  auth: {
    sessionTimeout: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
    refreshTokenThreshold: 5 * 60 * 1000, // 5 minutes before expiry
  },

  // Feature Flags
  features: {
    enableNotifications: process.env.NEXT_PUBLIC_ENABLE_NOTIFICATIONS !== 'false',
    enableAnalytics: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true',
    enableBatchUpload: process.env.NEXT_PUBLIC_ENABLE_BATCH_UPLOAD !== 'false',
    enableAdvancedSettings: process.env.NEXT_PUBLIC_ENABLE_ADVANCED_SETTINGS === 'true',
  },

  // UI Configuration
  ui: {
    theme: process.env.NEXT_PUBLIC_DEFAULT_THEME || 'light',
    supportedThemes: ['light', 'dark', 'system'],
    animationDuration: 300,
  },

  // External Services
  external: {
    googleAnalyticsId: process.env.NEXT_PUBLIC_GA_ID,
    sentryDsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  },

  // Development flags
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  enableDebugLogs: process.env.NEXT_PUBLIC_DEBUG_LOGS === 'true',
} as const;

// Helper functions
export const isFeatureEnabled = (feature: keyof typeof config.features): boolean => {
  return config.features[feature];
};

export const getApiEndpoint = (path: string): string => {
  return `${config.api.baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
};

export const validateFileUpload = (file: File): { isValid: boolean; error?: string } => {
  // Check file size
  if (file.size > config.upload.maxFileSize) {
    return {
      isValid: false,
      error: `File size must be less than ${Math.round(config.upload.maxFileSize / 1024 / 1024)}MB`
    };
  }

  // Check file type
  const fileExtension = file.name.split('.').pop()?.toLowerCase();
  if (!fileExtension || !config.upload.allowedFormats.includes(fileExtension)) {
    return {
      isValid: false,
      error: `Only ${config.upload.allowedFormats.join(', ')} files are allowed`
    };
  }

  return { isValid: true };
};

export { config };
