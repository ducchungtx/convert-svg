const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');
const { cache } = require('../utils/redis');

const prisma = new PrismaClient();

/**
 * Generate JWT token
 */
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (userId) => {
  return jwt.sign(
    { userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: '30d' }
  );
};

/**
 * Register new user
 */
const register = async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password, name } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        name,
        role: 'USER',
        dailyLimit: 10, // Default limit for new users
        resetDate: new Date()
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        dailyLimit: true,
        createdAt: true
      }
    });

    // Generate tokens
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token in Redis (expires in 30 days)
    await cache.set(`refresh:${user.id}`, refreshToken, 30 * 24 * 60 * 60);

    logger.info('User registered successfully', { userId: user.id, email });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        token,
        refreshToken
      }
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed'
    });
  }
};

/**
 * Login user
 */
const login = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Account is deactivated'
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });

    // Generate tokens
    const token = generateToken(user.id);
    const refreshToken = generateRefreshToken(user.id);

    // Store refresh token in Redis
    await cache.set(`refresh:${user.id}`, refreshToken, 30 * 24 * 60 * 60);

    // Prepare user data (exclude password)
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      dailyLimit: user.dailyLimit,
      dailyConversions: user.dailyConversions,
      createdAt: user.createdAt
    };

    logger.info('User logged in successfully', { userId: user.id, email });

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userData,
        token,
        refreshToken
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed'
    });
  }
};

/**
 * Refresh token
 */
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(400).json({
        success: false,
        message: 'Refresh token required'
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

    if (decoded.type !== 'refresh') {
      return res.status(401).json({
        success: false,
        message: 'Invalid refresh token'
      });
    }

    // Check if refresh token exists in Redis
    const storedToken = await cache.get(`refresh:${decoded.userId}`);
    if (storedToken !== refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token not found or expired'
      });
    }

    // Get user
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true
      }
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User not found or inactive'
      });
    }

    // Generate new tokens
    const newToken = generateToken(user.id);
    const newRefreshToken = generateRefreshToken(user.id);

    // Update refresh token in Redis
    await cache.set(`refresh:${user.id}`, newRefreshToken, 30 * 24 * 60 * 60);

    res.json({
      success: true,
      message: 'Token refreshed successfully',
      data: {
        user,
        token: newToken,
        refreshToken: newRefreshToken
      }
    });
  } catch (error) {
    logger.error('Token refresh error:', error);

    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Token refresh failed'
    });
  }
};

/**
 * Logout user
 */
const logout = async (req, res) => {
  try {
    const { token } = req;
    const userId = req.user.id;

    // Blacklist current token
    const decoded = jwt.decode(token);
    const expiresIn = decoded.exp - Math.floor(Date.now() / 1000);

    if (expiresIn > 0) {
      await cache.set(`blacklist:${token}`, 'true', expiresIn);
    }

    // Remove refresh token
    await cache.del(`refresh:${userId}`);

    logger.info('User logged out successfully', { userId });

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
};

/**
 * Get current user profile
 */
const getProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user with subscription information
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        subscriptionType: true,
        subscriptionStatus: true,
        subscriptionStart: true,
        subscriptionEnd: true,
        dailyLimit: true,
        monthlyLimit: true,
        usedToday: true,
        usedThisMonth: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get additional user stats
    const stats = await prisma.conversion.groupBy({
      by: ['status'],
      where: {
        userId: user.id
      },
      _count: {
        status: true
      }
    });

    const userStats = {
      totalConversions: stats.reduce((acc, stat) => acc + stat._count.status, 0),
      completedConversions: stats.find(s => s.status === 'COMPLETED')?._count.status || 0,
      failedConversions: stats.find(s => s.status === 'FAILED')?._count.status || 0,
      pendingConversions: stats.find(s => s.status === 'PENDING')?._count.status || 0,
      processingConversions: stats.find(s => s.status === 'PROCESSING')?._count.status || 0
    };

    // Calculate subscription info
    const subscriptionInfo = {
      type: user.subscriptionType,
      status: user.subscriptionStatus,
      startDate: user.subscriptionStart,
      endDate: user.subscriptionEnd,
      daysRemaining: user.subscriptionEnd ?
        Math.max(0, Math.ceil((new Date(user.subscriptionEnd) - new Date()) / (1000 * 60 * 60 * 24))) :
        null,
      isExpired: user.subscriptionEnd ? new Date(user.subscriptionEnd) < new Date() : false
    };

    // Calculate usage info
    const usageInfo = {
      daily: {
        used: user.usedToday,
        limit: user.dailyLimit,
        remaining: Math.max(0, user.dailyLimit - user.usedToday),
        percentage: user.dailyLimit > 0 ? Math.round((user.usedToday / user.dailyLimit) * 100) : 0
      },
      monthly: {
        used: user.usedThisMonth,
        limit: user.monthlyLimit,
        remaining: Math.max(0, user.monthlyLimit - user.usedThisMonth),
        percentage: user.monthlyLimit > 0 ? Math.round((user.usedThisMonth / user.monthlyLimit) * 100) : 0
      }
    };

    res.json({
      success: true,
      data: {
        user,
        stats: userStats,
        subscription: subscriptionInfo,
        usage: usageInfo
      }
    });
  } catch (error) {
    logger.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get profile'
    });
  }
};

/**
 * Update user profile
 */
const updateProfile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { name } = req.body;
    const userId = req.user.id;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { name },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        dailyLimit: true,
        dailyConversions: true,
        createdAt: true
      }
    });

    logger.info('User profile updated', { userId });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    logger.error('Update profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update profile'
    });
  }
};

/**
 * Change password
 */
const changePassword = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Get user with password
    const user = await prisma.user.findUnique({
      where: { id: userId }
    });

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    });

    logger.info('Password changed successfully', { userId });

    res.json({
      success: true,
      message: 'Password changed successfully'
    });
  } catch (error) {
    logger.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to change password'
    });
  }
};

/**
 * Update user subscription
 */
const updateSubscription = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { subscriptionType } = req.body;
    const userId = req.user.id;

    // Define subscription limits
    const subscriptionLimits = {
      FREE: { dailyLimit: 10, monthlyLimit: 100 },
      BASIC: { dailyLimit: 50, monthlyLimit: 1000 },
      PREMIUM: { dailyLimit: 200, monthlyLimit: 5000 },
      ENTERPRISE: { dailyLimit: 1000, monthlyLimit: 25000 }
    };

    const limits = subscriptionLimits[subscriptionType];
    if (!limits) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription type'
      });
    }

    // Calculate subscription dates
    const now = new Date();
    const subscriptionEnd = new Date(now);
    subscriptionEnd.setMonth(subscriptionEnd.getMonth() + 1); // 1 month subscription

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionType,
        subscriptionStatus: 'ACTIVE',
        subscriptionStart: subscriptionType === 'FREE' ? null : now,
        subscriptionEnd: subscriptionType === 'FREE' ? null : subscriptionEnd,
        dailyLimit: limits.dailyLimit,
        monthlyLimit: limits.monthlyLimit,
        role: subscriptionType === 'FREE' ? 'USER' : 'PREMIUM'
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        subscriptionType: true,
        subscriptionStatus: true,
        subscriptionStart: true,
        subscriptionEnd: true,
        dailyLimit: true,
        monthlyLimit: true
      }
    });

    logger.info('User subscription updated', {
      userId,
      oldSubscription: req.user.subscriptionType,
      newSubscription: subscriptionType
    });

    res.json({
      success: true,
      message: 'Subscription updated successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    logger.error('Update subscription error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update subscription'
    });
  }
};

/**
 * Get subscription plans
 */
const getSubscriptionPlans = async (req, res) => {
  try {
    const plans = [
      {
        type: 'FREE',
        name: 'Free Plan',
        price: 0,
        currency: 'USD',
        period: 'month',
        features: [
          '10 conversions per day',
          '100 conversions per month',
          'Basic file formats',
          'Email support'
        ],
        limits: {
          dailyLimit: 10,
          monthlyLimit: 100
        }
      },
      {
        type: 'BASIC',
        name: 'Basic Plan',
        price: 9.99,
        currency: 'USD',
        period: 'month',
        features: [
          '50 conversions per day',
          '1,000 conversions per month',
          'All file formats',
          'Priority email support',
          'Batch conversion'
        ],
        limits: {
          dailyLimit: 50,
          monthlyLimit: 1000
        }
      },
      {
        type: 'PREMIUM',
        name: 'Premium Plan',
        price: 19.99,
        currency: 'USD',
        period: 'month',
        features: [
          '200 conversions per day',
          '5,000 conversions per month',
          'All file formats',
          'Priority support',
          'Batch conversion',
          'API access',
          'Custom watermarks'
        ],
        limits: {
          dailyLimit: 200,
          monthlyLimit: 5000
        }
      },
      {
        type: 'ENTERPRISE',
        name: 'Enterprise Plan',
        price: 49.99,
        currency: 'USD',
        period: 'month',
        features: [
          '1,000 conversions per day',
          '25,000 conversions per month',
          'All file formats',
          '24/7 support',
          'Batch conversion',
          'API access',
          'Custom watermarks',
          'White-label solution'
        ],
        limits: {
          dailyLimit: 1000,
          monthlyLimit: 25000
        }
      }
    ];

    res.json({
      success: true,
      data: { plans }
    });
  } catch (error) {
    logger.error('Get subscription plans error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subscription plans'
    });
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  getProfile,
  updateProfile,
  changePassword,
  updateSubscription,
  getSubscriptionPlans
};
