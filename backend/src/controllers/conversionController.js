const { validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../utils/logger');
const { Queue } = require('bullmq');
const redis = require('../utils/redis');
const { checkAndUpdateUsage, canAccessFeature } = require('../utils/subscriptionHelper');

const prisma = new PrismaClient();

// Initialize conversion queue
const conversionQueue = new Queue('file-conversion', {
  connection: redis.connection,
  defaultJobOptions: {
    removeOnComplete: 100,
    removeOnFail: 50,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
});

/**
 * Get supported conversion types
 */
const getSupportedConversions = (req, res) => {
  const conversions = {
    SVG: {
      to: ['PNG', 'JPG', 'JPEG', 'PDF'],
      from: ['EPS']
    },
    PNG: {
      to: ['SVG', 'JPG', 'JPEG'],
      from: []
    },
    JPG: {
      to: ['SVG', 'PNG'],
      from: []
    },
    JPEG: {
      to: ['SVG', 'PNG'],
      from: []
    },
    PDF: {
      to: ['SVG', 'PNG', 'JPG'],
      from: []
    },
    EPS: {
      to: ['SVG', 'PNG', 'JPG', 'PDF'],
      from: []
    }
  };

  res.json({
    success: true,
    data: { conversions }
  });
};

/**
 * Start file conversion
 */
const convertFile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { targetFormat, quality, width, height } = req.body;
    const fileInfo = req.fileInfo;
    const user = req.user;

    // Check subscription limits using the new subscription system
    if (user) {
      const usageCheck = await checkAndUpdateUsage(user.id, 'conversion');
      if (!usageCheck.canUse) {
        // Clean up uploaded file
        await fs.unlink(fileInfo.tempPath).catch(err =>
          logger.error('Failed to cleanup file:', err)
        );

        return res.status(429).json({
          success: false,
          message: usageCheck.message
        });
      }
    } else {
      // For anonymous users, check if they can access conversion feature
      if (!canAccessFeature('FREE', 'conversion')) {
        await fs.unlink(fileInfo.tempPath).catch(err =>
          logger.error('Failed to cleanup file:', err)
        );

        return res.status(401).json({
          success: false,
          message: 'Please sign up to access conversion features'
        });
      }
    }

    // Validate conversion
    const sourceFormat = getFormatFromMimeType(fileInfo.mimeType);
    if (!isConversionSupported(sourceFormat, targetFormat)) {
      await fs.unlink(fileInfo.tempPath).catch(err =>
        logger.error('Failed to cleanup file:', err)
      );

      return res.status(400).json({
        success: false,
        message: `Conversion from ${sourceFormat} to ${targetFormat} is not supported`
      });
    }

    // Create conversion record
    const conversion = await prisma.conversion.create({
      data: {
        id: uuidv4(),
        userId: user?.id,
        originalFilename: fileInfo.originalName,
        sourceFormat,
        targetFormat,
        fileSize: fileInfo.size,
        status: 'PENDING',
        settings: {
          quality: quality ? parseInt(quality) : undefined,
          width: width ? parseInt(width) : undefined,
          height: height ? parseInt(height) : undefined
        },
        inputPath: fileInfo.tempPath
      }
    });

    // Add job to queue
    await conversionQueue.add('convert-file', {
      conversionId: conversion.id,
      inputPath: fileInfo.tempPath,
      sourceFormat,
      targetFormat,
      settings: conversion.settings,
      userId: user?.id
    }, {
      jobId: conversion.id,
      delay: 0
    });

    logger.info('Conversion job queued', {
      conversionId: conversion.id,
      sourceFormat,
      targetFormat,
      userId: user?.id
    });

    res.status(202).json({
      success: true,
      message: 'Conversion started',
      data: {
        conversionId: conversion.id,
        status: conversion.status,
        estimatedTime: getEstimatedTime(sourceFormat, targetFormat, fileInfo.size)
      }
    });
  } catch (error) {
    logger.error('Conversion error:', error);

    // Clean up uploaded file
    if (req.fileInfo && req.fileInfo.tempPath) {
      await fs.unlink(req.fileInfo.tempPath).catch(err =>
        logger.error('Failed to cleanup file:', err)
      );
    }

    res.status(500).json({
      success: false,
      message: 'Conversion failed to start'
    });
  }
};

/**
 * Get conversion status
 */
const getConversionStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const conversion = await prisma.conversion.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        progress: true,
        sourceFormat: true,
        targetFormat: true,
        originalFilename: true,
        outputFilename: true,
        fileSize: true,
        outputSize: true,
        createdAt: true,
        completedAt: true,
        errorMessage: true,
        userId: true
      }
    });

    if (!conversion) {
      return res.status(404).json({
        success: false,
        message: 'Conversion not found'
      });
    }

    // Check access permissions
    if (conversion.userId && (!user || conversion.userId !== user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    res.json({
      success: true,
      data: { conversion }
    });
  } catch (error) {
    logger.error('Get conversion status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get conversion status'
    });
  }
};

/**
 * Download converted file
 */
const downloadFile = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const conversion = await prisma.conversion.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        outputPath: true,
        outputFilename: true,
        targetFormat: true,
        userId: true
      }
    });

    if (!conversion) {
      return res.status(404).json({
        success: false,
        message: 'Conversion not found'
      });
    }

    // Check access permissions
    if (conversion.userId && (!user || conversion.userId !== user.id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    if (conversion.status !== 'COMPLETED') {
      return res.status(400).json({
        success: false,
        message: 'Conversion not completed yet'
      });
    }

    if (!conversion.outputPath) {
      return res.status(404).json({
        success: false,
        message: 'Output file not found'
      });
    }

    // Check if file exists
    try {
      await fs.access(conversion.outputPath);
    } catch {
      return res.status(404).json({
        success: false,
        message: 'Output file no longer available'
      });
    }

    // Update download count
    await prisma.conversion.update({
      where: { id },
      data: {
        downloadCount: {
          increment: 1
        },
        lastDownloadAt: new Date()
      }
    });

    // Set appropriate headers
    const filename = conversion.outputFilename || `converted.${conversion.targetFormat.toLowerCase()}`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', getMimeTypeFromFormat(conversion.targetFormat));

    // Stream file
    const fileStream = require('fs').createReadStream(conversion.outputPath);
    fileStream.pipe(res);

    logger.info('File downloaded', { conversionId: id, userId: user?.id });
  } catch (error) {
    logger.error('Download file error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download file'
    });
  }
};

/**
 * Get user's conversion history
 */
const getConversions = async (req, res) => {
  try {
    const user = req.user;
    const { page = 1, limit = 20, status, format } = req.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      userId: user.id
    };

    if (status) {
      where.status = status.toUpperCase();
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
          status: true,
          progress: true,
          fromFormat: true,
          toFormat: true,
          originalFilename: true,
          fileSize: true,
          outputFileSize: true,
          createdAt: true,
          completedAt: true,
          downloadCount: true
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
 * Delete conversion
 */
const deleteConversion = async (req, res) => {
  try {
    const { id } = req.params;
    const user = req.user;

    const conversion = await prisma.conversion.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
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

    if (conversion.userId !== user.id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
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

    logger.info('Conversion deleted', { conversionId: id, userId: user.id });

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

// Helper functions

const getFormatFromMimeType = (mimeType) => {
  const mimeMap = {
    'image/svg+xml': 'SVG',
    'image/png': 'PNG',
    'image/jpeg': 'JPG',
    'image/jpg': 'JPG',
    'application/pdf': 'PDF',
    'application/postscript': 'EPS',
    'image/x-eps': 'EPS'
  };
  return mimeMap[mimeType] || 'UNKNOWN';
};

const getMimeTypeFromFormat = (format) => {
  const formatMap = {
    'SVG': 'image/svg+xml',
    'PNG': 'image/png',
    'JPG': 'image/jpeg',
    'JPEG': 'image/jpeg',
    'PDF': 'application/pdf',
    'EPS': 'application/postscript'
  };
  return formatMap[format] || 'application/octet-stream';
};

const isConversionSupported = (source, target) => {
  const supportedConversions = {
    SVG: ['PNG', 'JPG', 'JPEG', 'PDF'],
    PNG: ['SVG', 'JPG', 'JPEG'],
    JPG: ['SVG', 'PNG'],
    JPEG: ['SVG', 'PNG'],
    PDF: ['SVG', 'PNG', 'JPG', 'JPEG'],
    EPS: ['SVG', 'PNG', 'JPG', 'JPEG', 'PDF']
  };

  return supportedConversions[source]?.includes(target) || false;
};

const getEstimatedTime = (sourceFormat, targetFormat, fileSize) => {
  // Base time in seconds
  let baseTime = 5;

  // Adjust for file size (MB)
  const sizeMB = fileSize / (1024 * 1024);
  baseTime += sizeMB * 2;

  // Adjust for complexity
  if (sourceFormat === 'EPS' || targetFormat === 'EPS') baseTime *= 1.5;
  if (targetFormat === 'PDF') baseTime *= 1.2;
  if (sourceFormat === 'PDF') baseTime *= 1.3;

  return Math.max(5, Math.min(120, Math.round(baseTime)));
};

module.exports = {
  getSupportedConversions,
  convertFile,
  getConversionStatus,
  downloadFile,
  getConversions,
  deleteConversion
};
