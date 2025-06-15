const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

/**
 * Default configurations for different user types and subscription levels
 */
const DEFAULT_CONFIGS = {
  GUEST: {
    FREE: {
      maxFilesPerConversion: 1,
      maxFileSize: 10 * 1024 * 1024, // 10MB
      maxDailyConversions: 5,
      maxMonthlyConversions: 20,
      allowedFormats: ['png', 'jpg', 'pdf'],
      maxConcurrentJobs: 1,
      priorityLevel: 0,
      rateLimitPerMinute: 2,
      rateLimitPerHour: 10
    }
  },
  USER: {
    FREE: {
      maxFilesPerConversion: 3,
      maxFileSize: 25 * 1024 * 1024, // 25MB
      maxDailyConversions: 20,
      maxMonthlyConversions: 100,
      allowedFormats: ['png', 'jpg', 'pdf', 'svg', 'webp'],
      maxConcurrentJobs: 2,
      priorityLevel: 1,
      rateLimitPerMinute: 5,
      rateLimitPerHour: 50
    },
    BASIC: {
      maxFilesPerConversion: 5,
      maxFileSize: 50 * 1024 * 1024, // 50MB
      maxDailyConversions: 50,
      maxMonthlyConversions: 500,
      allowedFormats: ['png', 'jpg', 'pdf', 'svg', 'webp', 'ico', 'bmp'],
      maxConcurrentJobs: 3,
      priorityLevel: 2,
      rateLimitPerMinute: 10,
      rateLimitPerHour: 100
    },
    PREMIUM: {
      maxFilesPerConversion: 10,
      maxFileSize: 100 * 1024 * 1024, // 100MB
      maxDailyConversions: 200,
      maxMonthlyConversions: null, // unlimited
      allowedFormats: ['png', 'jpg', 'pdf', 'svg', 'webp', 'ico', 'bmp', 'tiff', 'eps'],
      maxConcurrentJobs: 5,
      priorityLevel: 3,
      rateLimitPerMinute: 20,
      rateLimitPerHour: 300
    },
    ENTERPRISE: {
      maxFilesPerConversion: 50,
      maxFileSize: 500 * 1024 * 1024, // 500MB
      maxDailyConversions: 1000,
      maxMonthlyConversions: null, // unlimited
      allowedFormats: ['png', 'jpg', 'pdf', 'svg', 'webp', 'ico', 'bmp', 'tiff', 'eps', 'ai'],
      maxConcurrentJobs: 10,
      priorityLevel: 4,
      rateLimitPerMinute: 50,
      rateLimitPerHour: 1000
    }
  }
};

/**
 * Initialize default configurations in database
 */
const initializeDefaultConfigs = async () => {
  try {
    for (const userType of Object.keys(DEFAULT_CONFIGS)) {
      for (const subscriptionType of Object.keys(DEFAULT_CONFIGS[userType])) {
        const config = DEFAULT_CONFIGS[userType][subscriptionType];

        await prisma.limitConfiguration.upsert({
          where: {
            subscriptionType_userType: {
              subscriptionType,
              userType
            }
          },
          update: {
            ...config,
            allowedFormats: JSON.stringify(config.allowedFormats)
          },
          create: {
            subscriptionType,
            userType,
            ...config,
            allowedFormats: JSON.stringify(config.allowedFormats)
          }
        });
      }
    }

    logger.info('Default limit configurations initialized');
  } catch (error) {
    logger.error('Failed to initialize default configurations:', error);
    throw error;
  }
};

/**
 * Get limit configuration for user
 */
const getLimitConfig = async (user = null, isGuest = false) => {
  try {
    let userType, subscriptionType;

    if (isGuest) {
      userType = 'GUEST';
      subscriptionType = 'FREE';
    } else if (user) {
      userType = 'USER';
      subscriptionType = user.subscriptionType || 'FREE';
    } else {
      throw new Error('Invalid user context');
    }

    const config = await prisma.limitConfiguration.findUnique({
      where: {
        subscriptionType_userType: {
          subscriptionType,
          userType
        }
      }
    });

    if (!config) {
      // Return default config if not found in database
      const defaultConfig = DEFAULT_CONFIGS[userType]?.[subscriptionType];
      if (defaultConfig) {
        return {
          ...defaultConfig,
          allowedFormats: defaultConfig.allowedFormats
        };
      }
      throw new Error('Configuration not found');
    }

    return {
      ...config,
      allowedFormats: JSON.parse(config.allowedFormats)
    };
  } catch (error) {
    logger.error('Failed to get limit configuration:', error);
    throw error;
  }
};

/**
 * Update limit configuration
 */
const updateLimitConfig = async (subscriptionType, userType, updates) => {
  try {
    if (updates.allowedFormats && Array.isArray(updates.allowedFormats)) {
      updates.allowedFormats = JSON.stringify(updates.allowedFormats);
    }

    const config = await prisma.limitConfiguration.upsert({
      where: {
        subscriptionType_userType: {
          subscriptionType,
          userType
        }
      },
      update: updates,
      create: {
        subscriptionType,
        userType,
        ...updates
      }
    });

    logger.info('Limit configuration updated', {
      subscriptionType,
      userType,
      updates
    });

    return config;
  } catch (error) {
    logger.error('Failed to update limit configuration:', error);
    throw error;
  }
};

/**
 * Get all limit configurations
 */
const getAllLimitConfigs = async () => {
  try {
    const configs = await prisma.limitConfiguration.findMany({
      orderBy: [
        { userType: 'asc' },
        { subscriptionType: 'asc' }
      ]
    });

    return configs.map(config => ({
      ...config,
      allowedFormats: JSON.parse(config.allowedFormats)
    }));
  } catch (error) {
    logger.error('Failed to get all limit configurations:', error);
    throw error;
  }
};

/**
 * Validate if user can perform conversion based on limits
 */
const validateConversionLimits = async (user = null, isGuest = false, conversionData = {}) => {
  try {
    const config = await getLimitConfig(user, isGuest);
    const errors = [];

    // Check file count
    if (conversionData.fileCount > config.maxFilesPerConversion) {
      errors.push(`Maximum ${config.maxFilesPerConversion} files allowed per conversion`);
    }

    // Check file size
    if (conversionData.fileSize > config.maxFileSize) {
      errors.push(`File size cannot exceed ${Math.round(config.maxFileSize / 1024 / 1024)}MB`);
    }

    // Check format support
    if (conversionData.format && !config.allowedFormats.includes(conversionData.format)) {
      errors.push(`Format ${conversionData.format} is not supported for your plan`);
    }

    // Check daily limit
    if (user && !isGuest) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const todayConversions = await prisma.conversion.count({
        where: {
          userId: user.id,
          createdAt: {
            gte: today
          }
        }
      });

      if (todayConversions >= config.maxDailyConversions) {
        errors.push(`Daily conversion limit of ${config.maxDailyConversions} reached`);
      }
    }

    // Check monthly limit for registered users
    if (user && !isGuest && config.maxMonthlyConversions) {
      const thisMonth = new Date();
      thisMonth.setDate(1);
      thisMonth.setHours(0, 0, 0, 0);

      const monthlyConversions = await prisma.conversion.count({
        where: {
          userId: user.id,
          createdAt: {
            gte: thisMonth
          }
        }
      });

      if (monthlyConversions >= config.maxMonthlyConversions) {
        errors.push(`Monthly conversion limit of ${config.maxMonthlyConversions} reached`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      config
    };
  } catch (error) {
    logger.error('Failed to validate conversion limits:', error);
    throw error;
  }
};

/**
 * Get guest limits for frontend
 */
const getGuestLimits = async () => {
  try {
    const config = await getLimitConfig(null, true);
    return {
      maxFiles: config.maxFilesPerConversion,
      maxFileSize: config.maxFileSize,
      dailyLimit: config.maxDailyConversions,
      supportedFormats: config.allowedFormats,
      rateLimitPerMinute: config.rateLimitPerMinute
    };
  } catch (error) {
    logger.error('Failed to get guest limits:', error);
    throw error;
  }
};

module.exports = {
  initializeDefaultConfigs,
  getLimitConfig,
  updateLimitConfig,
  getAllLimitConfigs,
  validateConversionLimits,
  getGuestLimits,
  DEFAULT_CONFIGS
};
