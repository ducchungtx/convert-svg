const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

const prisma = new PrismaClient();

/**
 * Check and update user usage limits
 */
const checkAndUpdateUsage = async (userId, featureType = 'conversion', increment = 1) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        dailyLimit: true,
        monthlyLimit: true,
        usedToday: true,
        usedThisMonth: true,
        resetDate: true,
        subscriptionType: true,
        subscriptionStatus: true,
        subscriptionEnd: true
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    // Check if subscription is expired
    if (user.subscriptionEnd && new Date(user.subscriptionEnd) < new Date()) {
      // Reset to FREE plan if subscription expired
      await prisma.user.update({
        where: { id: userId },
        data: {
          subscriptionType: 'FREE',
          subscriptionStatus: 'EXPIRED',
          dailyLimit: 10,
          monthlyLimit: 100
        }
      });

      // Refresh user data
      const updatedUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          dailyLimit: true,
          monthlyLimit: true,
          usedToday: true,
          usedThisMonth: true
        }
      });

      user.dailyLimit = updatedUser.dailyLimit;
      user.monthlyLimit = updatedUser.monthlyLimit;
      user.usedToday = updatedUser.usedToday;
      user.usedThisMonth = updatedUser.usedThisMonth;
    }

    // Check if we need to reset daily counter
    const now = new Date();
    const lastReset = new Date(user.resetDate);
    const shouldResetDaily = now.getDate() !== lastReset.getDate() ||
      now.getMonth() !== lastReset.getMonth() ||
      now.getFullYear() !== lastReset.getFullYear();

    // Check if we need to reset monthly counter
    const shouldResetMonthly = now.getMonth() !== lastReset.getMonth() ||
      now.getFullYear() !== lastReset.getFullYear();

    let updateData = {};

    if (shouldResetDaily) {
      updateData.usedToday = 0;
      updateData.resetDate = now;
    }

    if (shouldResetMonthly) {
      updateData.usedThisMonth = 0;
    }

    // Update reset counters if needed
    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: userId },
        data: updateData
      });

      user.usedToday = updateData.usedToday || user.usedToday;
      user.usedThisMonth = updateData.usedThisMonth || user.usedThisMonth;
    }

    // Check limits
    const newDailyUsage = user.usedToday + increment;
    const newMonthlyUsage = user.usedThisMonth + increment;

    if (newDailyUsage > user.dailyLimit) {
      return {
        canUse: false,
        success: false,
        error: 'DAILY_LIMIT_EXCEEDED',
        message: `Daily limit of ${user.dailyLimit} conversions exceeded. Please upgrade your plan or try again tomorrow.`,
        limits: {
          daily: { used: user.usedToday, limit: user.dailyLimit },
          monthly: { used: user.usedThisMonth, limit: user.monthlyLimit }
        }
      };
    }

    if (newMonthlyUsage > user.monthlyLimit) {
      return {
        canUse: false,
        success: false,
        error: 'MONTHLY_LIMIT_EXCEEDED',
        message: `Monthly limit of ${user.monthlyLimit} conversions exceeded. Please upgrade your plan.`,
        limits: {
          daily: { used: user.usedToday, limit: user.dailyLimit },
          monthly: { used: user.usedThisMonth, limit: user.monthlyLimit }
        }
      };
    }

    // Update usage counters
    await prisma.user.update({
      where: { id: userId },
      data: {
        usedToday: newDailyUsage,
        usedThisMonth: newMonthlyUsage
      }
    });

    return {
      canUse: true,
      success: true,
      limits: {
        daily: {
          used: newDailyUsage,
          limit: user.dailyLimit,
          remaining: user.dailyLimit - newDailyUsage
        },
        monthly: {
          used: newMonthlyUsage,
          limit: user.monthlyLimit,
          remaining: user.monthlyLimit - newMonthlyUsage
        }
      }
    };

  } catch (error) {
    logger.error('Check and update usage error:', error);
    throw error;
  }
};

/**
 * Get subscription features based on type
 */
const getSubscriptionFeatures = (subscriptionType) => {
  const features = {
    FREE: {
      dailyLimit: 10,
      monthlyLimit: 100,
      fileFormats: ['PNG', 'JPG', 'SVG'],
      batchConversion: false,
      apiAccess: false,
      prioritySupport: false,
      customWatermarks: false
    },
    BASIC: {
      dailyLimit: 50,
      monthlyLimit: 1000,
      fileFormats: ['PNG', 'JPG', 'SVG', 'PDF', 'WebP'],
      batchConversion: true,
      apiAccess: false,
      prioritySupport: true,
      customWatermarks: false
    },
    PREMIUM: {
      dailyLimit: 200,
      monthlyLimit: 5000,
      fileFormats: ['PNG', 'JPG', 'SVG', 'PDF', 'WebP', 'TIFF', 'BMP'],
      batchConversion: true,
      apiAccess: true,
      prioritySupport: true,
      customWatermarks: true
    },
    ENTERPRISE: {
      dailyLimit: 1000,
      monthlyLimit: 25000,
      fileFormats: ['PNG', 'JPG', 'SVG', 'PDF', 'WebP', 'TIFF', 'BMP', 'ICO'],
      batchConversion: true,
      apiAccess: true,
      prioritySupport: true,
      customWatermarks: true,
      whiteLabel: true
    }
  };

  return features[subscriptionType] || features.FREE;
};

/**
 * Check if user can access a feature
 */
const canAccessFeature = (subscriptionType, feature) => {
  const features = getSubscriptionFeatures(subscriptionType);

  // Special handling for basic features that all users can access
  if (feature === 'conversion') {
    return true; // All subscription types can convert files
  }

  return features[feature] || false;
};

module.exports = {
  checkAndUpdateUsage,
  getSubscriptionFeatures,
  canAccessFeature
};
