const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');
const logger = require('../utils/logger');
const redis = require('../utils/redis');
const { Queue } = require('bullmq');
const limitConfigService = require('../services/limitConfigService');

const prisma = new PrismaClient();

// Initialize conversion queue for management
const conversionQueue = new Queue('file-conversion', {
  connection: redis.connection
});

/**
 * Get system statistics
 */
const getSystemStats = async (req, res) => {
  try {
    // Get user statistics
    const userStats = await prisma.user.groupBy({
      by: ['role'],
      _count: {
        role: true
      }
    });

    // Get conversion statistics
    const conversionStats = await prisma.conversion.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    });

    // Get daily conversion stats for the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const dailyStats = await prisma.conversion.groupBy({
      by: ['createdAt'],
      where: {
        createdAt: {
          gte: sevenDaysAgo
        }
      },
      _count: {
        id: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Get queue statistics
    const queueStats = {
      waiting: await conversionQueue.getWaiting(),
      active: await conversionQueue.getActive(),
      completed: await conversionQueue.getCompleted(),
      failed: await conversionQueue.getFailed()
    };

    // Calculate total file sizes
    const fileSizeStats = await prisma.conversion.aggregate({
      _sum: {
        fileSize: true,
        outputSize: true
      },
      where: {
        status: 'COMPLETED'
      }
    });

    res.json({
      success: true,
      data: {
        users: {
          total: userStats.reduce((acc, stat) => acc + stat._count.role, 0),
          byRole: userStats.reduce((acc, stat) => {
            acc[stat.role] = stat._count.role;
            return acc;
          }, {})
        },
        conversions: {
          total: conversionStats.reduce((acc, stat) => acc + stat._count.status, 0),
          byStatus: conversionStats.reduce((acc, stat) => {
            acc[stat.status] = stat._count.status;
            return acc;
          }, {}),
          daily: dailyStats,
          totalInputSize: fileSizeStats._sum.fileSize || 0,
          totalOutputSize: fileSizeStats._sum.outputSize || 0
        },
        queue: {
          waiting: queueStats.waiting.length,
          active: queueStats.active.length,
          completed: queueStats.completed.length,
          failed: queueStats.failed.length
        }
      }
    });
  } catch (error) {
    logger.error('Get system stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get system statistics'
    });
  }
};

/**
 * Get all users with pagination
 */
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = {};

    if (role) {
      where.role = role.toUpperCase();
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } }
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          isActive: true,
          dailyLimit: true,
          dailyConversions: true,
          lastLogin: true,
          createdAt: true,
          _count: {
            select: {
              conversions: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get users'
    });
  }
};

/**
 * Update user
 */
const updateUser = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { id } = req.params;
    const { role, isActive, dailyLimit } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        role,
        isActive,
        dailyLimit
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        dailyLimit: true,
        createdAt: true
      }
    });

    logger.info('User updated by admin', {
      adminId: req.user.id,
      targetUserId: id,
      changes: { role, isActive, dailyLimit }
    });

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user: updatedUser }
    });
  } catch (error) {
    logger.error('Update user error:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
};

/**
 * Delete user
 */
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Don't allow deleting the current admin
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    // Delete user's conversions first (cascade)
    await prisma.conversion.deleteMany({
      where: { userId: id }
    });

    // Delete user
    await prisma.user.delete({
      where: { id }
    });

    logger.info('User deleted by admin', {
      adminId: req.user.id,
      deletedUserId: id
    });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    logger.error('Delete user error:', error);

    if (error.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
};

/**
 * Get all conversions with admin details
 */
const getConversions = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, userId, format } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = {};

    if (status) {
      where.status = status.toUpperCase();
    }

    if (userId) {
      where.userId = userId;
    }

    if (format) {
      where.OR = [
        { sourceFormat: format.toUpperCase() },
        { targetFormat: format.toUpperCase() }
      ];
    }

    const [conversions, total] = await Promise.all([
      prisma.conversion.findMany({
        where,
        select: {
          id: true,
          originalFilename: true,
          sourceFormat: true,
          targetFormat: true,
          status: true,
          progress: true,
          fileSize: true,
          outputSize: true,
          downloadCount: true,
          createdAt: true,
          completedAt: true,
          errorMessage: true,
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.conversion.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        conversions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Get conversions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conversions'
    });
  }
};

/**
 * Delete conversion (admin)
 */
const deleteConversion = async (req, res) => {
  try {
    const { id } = req.params;

    const conversion = await prisma.conversion.findUnique({
      where: { id },
      select: {
        id: true,
        inputPath: true,
        outputPath: true,
        status: true
      }
    });

    if (!conversion) {
      return res.status(404).json({
        success: false,
        message: 'Conversion not found'
      });
    }

    // Cancel job if still processing
    if (conversion.status === 'PENDING' || conversion.status === 'PROCESSING') {
      try {
        await conversionQueue.remove(id);
      } catch (error) {
        logger.warn('Failed to remove job from queue:', error);
      }
    }

    // Delete files
    const fs = require('fs').promises;
    const filesToDelete = [conversion.inputPath, conversion.outputPath].filter(Boolean);
    for (const filePath of filesToDelete) {
      try {
        await fs.unlink(filePath);
      } catch (error) {
        logger.warn(`Failed to delete file ${filePath}:`, error);
      }
    }

    // Delete conversion record
    await prisma.conversion.delete({
      where: { id }
    });

    logger.info('Conversion deleted by admin', {
      adminId: req.user.id,
      conversionId: id
    });

    res.json({
      success: true,
      message: 'Conversion deleted successfully'
    });
  } catch (error) {
    logger.error('Delete conversion error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete conversion'
    });
  }
};

/**
 * Get system settings
 */
const getSettings = async (req, res) => {
  try {
    const settings = await prisma.setting.findMany({
      select: {
        key: true,
        value: true,
        description: true,
        updatedAt: true
      }
    });

    const settingsMap = settings.reduce((acc, setting) => {
      acc[setting.key] = {
        value: setting.value,
        description: setting.description,
        updatedAt: setting.updatedAt
      };
      return acc;
    }, {});

    res.json({
      success: true,
      data: { settings: settingsMap }
    });
  } catch (error) {
    logger.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get settings'
    });
  }
};

/**
 * Update system settings
 */
const updateSettings = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { settings } = req.body;

    // Update each setting
    const updatePromises = Object.entries(settings).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: {
          key,
          value: String(value),
          description: `Setting for ${key}`
        }
      })
    );

    await Promise.all(updatePromises);

    logger.info('Settings updated by admin', {
      adminId: req.user.id,
      settings: Object.keys(settings)
    });

    res.json({
      success: true,
      message: 'Settings updated successfully'
    });
  } catch (error) {
    logger.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update settings'
    });
  }
};

/**
 * Clear failed queue jobs
 */
const clearFailedJobs = async (req, res) => {
  try {
    await conversionQueue.clean(0, 'failed');

    logger.info('Failed jobs cleared by admin', { adminId: req.user.id });

    res.json({
      success: true,
      message: 'Failed jobs cleared successfully'
    });
  } catch (error) {
    logger.error('Clear failed jobs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to clear failed jobs'
    });
  }
};

/**
 * Get system logs
 */
const getLogs = async (req, res) => {
  try {
    const { page = 1, limit = 50, level } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = {};

    if (level) {
      where.level = level.toUpperCase();
    }

    const [logs, total] = await Promise.all([
      prisma.systemLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.systemLog.count({ where })
    ]);

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    logger.error('Get logs error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get logs'
    });
  }
};

/**
 * Get all limit configurations
 */
const getLimitConfigurations = async (req, res) => {
  try {
    const configs = await limitConfigService.getAllLimitConfigs();

    res.json({
      success: true,
      data: { configurations: configs }
    });
  } catch (error) {
    logger.error('Get limit configurations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get limit configurations'
    });
  }
};

/**
 * Update limit configuration
 */
const updateLimitConfiguration = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { subscriptionType, userType } = req.params;
    const updates = req.body;

    // Remove non-updatable fields
    delete updates.id;
    delete updates.createdAt;
    delete updates.updatedAt;

    const config = await limitConfigService.updateLimitConfig(
      subscriptionType,
      userType,
      updates
    );

    logger.info('Limit configuration updated by admin', {
      adminId: req.user.id,
      subscriptionType,
      userType,
      updates
    });

    res.json({
      success: true,
      message: 'Limit configuration updated successfully',
      data: { configuration: config }
    });
  } catch (error) {
    logger.error('Update limit configuration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update limit configuration'
    });
  }
};

/**
 * Get guest limits (public endpoint)
 */
const getGuestLimits = async (req, res) => {
  try {
    const limits = await limitConfigService.getGuestLimits();

    res.json({
      success: true,
      data: { limits }
    });
  } catch (error) {
    logger.error('Get guest limits error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get guest limits'
    });
  }
};

/**
 * Initialize default configurations
 */
const initializeLimitConfigs = async (req, res) => {
  try {
    await limitConfigService.initializeDefaultConfigs();

    logger.info('Default limit configurations initialized by admin', {
      adminId: req.user.id
    });

    res.json({
      success: true,
      message: 'Default limit configurations initialized successfully'
    });
  } catch (error) {
    logger.error('Initialize limit configurations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize limit configurations'
    });
  }
};

module.exports = {
  getSystemStats,
  getUsers,
  updateUser,
  deleteUser,
  getConversions,
  deleteConversion,
  getSettings,
  updateSettings,
  clearFailedJobs,
  getLogs,
  getLimitConfigurations,
  updateLimitConfiguration,
  getGuestLimits,
  initializeLimitConfigs
};
