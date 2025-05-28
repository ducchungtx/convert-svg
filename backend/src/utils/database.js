const { PrismaClient } = require('@prisma/client');
const logger = require('./logger');

const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
});

// Log database queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    logger.debug('Database Query', {
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`,
    });
  });
}

// Log database errors
prisma.$on('error', (e) => {
  logger.error('Database Error', e);
});

// Database connection function
async function connectDatabase() {
  try {
    await prisma.$connect();
    logger.info('Database connection established');

    // Test the connection
    await prisma.$queryRaw`SELECT 1`;

    return prisma;
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
}

// Database health check
async function checkDatabaseHealth() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return { status: 'healthy', timestamp: new Date().toISOString() };
  } catch (error) {
    logger.error('Database health check failed:', error);
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Graceful shutdown
async function disconnectDatabase() {
  try {
    await prisma.$disconnect();
    logger.info('Database connection closed');
  } catch (error) {
    logger.error('Error closing database connection:', error);
  }
}

// Database utility functions
const dbUtils = {
  // Get user by email
  async getUserByEmail(email) {
    return await prisma.user.findUnique({
      where: { email },
      include: {
        conversions: {
          take: 5,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  },

  // Get user by ID
  async getUserById(id) {
    return await prisma.user.findUnique({
      where: { id: parseInt(id) },
      include: {
        conversions: {
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
      },
    });
  },

  // Update user daily usage
  async updateUserUsage(userId, increment = 1) {
    const today = new Date().toISOString().split('T')[0];

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    // Reset counter if it's a new day
    const resetDate = user.resetDate.toISOString().split('T')[0];
    const shouldReset = resetDate !== today;

    return await prisma.user.update({
      where: { id: userId },
      data: {
        usedToday: shouldReset ? increment : user.usedToday + increment,
        resetDate: shouldReset ? new Date() : user.resetDate,
      },
    });
  },

  // Create conversion record
  async createConversion(data) {
    return await prisma.conversion.create({
      data: {
        ...data,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      },
    });
  },

  // Update conversion status
  async updateConversion(id, data) {
    return await prisma.conversion.update({
      where: { id },
      data,
    });
  },

  // Get conversion by ID
  async getConversionById(id) {
    return await prisma.conversion.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
          },
        },
      },
    });
  },

  // Clean up expired conversions
  async cleanupExpiredConversions() {
    const result = await prisma.conversion.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    logger.info(`Cleaned up ${result.count} expired conversions`);
    return result;
  },

  // Get system statistics
  async getSystemStats() {
    const [
      totalUsers,
      totalConversions,
      todayConversions,
      failedConversions,
      activeUsers,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.conversion.count(),
      prisma.conversion.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
        },
      }),
      prisma.conversion.count({
        where: { status: 'FAILED' },
      }),
      prisma.user.count({
        where: {
          lastLoginAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
      }),
    ]);

    return {
      totalUsers,
      totalConversions,
      todayConversions,
      failedConversions,
      activeUsers,
      successRate: totalConversions > 0
        ? ((totalConversions - failedConversions) / totalConversions * 100).toFixed(2)
        : 0,
    };
  },

  // Get settings
  async getSettings(isPublic = false) {
    const where = isPublic ? { isPublic: true } : {};

    const settings = await prisma.setting.findMany({ where });

    // Convert to key-value object
    return settings.reduce((acc, setting) => {
      acc[setting.key] = setting.value;
      return acc;
    }, {});
  },

  // Update setting
  async updateSetting(key, value, updatedBy) {
    return await prisma.setting.upsert({
      where: { key },
      update: { value, updatedBy },
      create: { key, value, updatedBy },
    });
  },
};

module.exports = {
  prisma,
  connectDatabase,
  disconnectDatabase,
  checkDatabaseHealth,
  ...dbUtils,
};
