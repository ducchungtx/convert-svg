const { Worker } = require('bullmq');
const { PrismaClient } = require('@prisma/client');
const redis = require('../utils/redis');
const logger = require('../utils/logger');
const conversionService = require('../services/conversionService');

const prisma = new PrismaClient();

/**
 * File conversion worker
 */
const conversionWorker = new Worker('file-conversion', async (job) => {
  const { conversionId, inputPath, sourceFormat, targetFormat, settings, userId } = job.data;

  logger.info('Starting conversion job', { conversionId, sourceFormat, targetFormat });

  try {
    // Update status to processing
    await prisma.conversion.update({
      where: { id: conversionId },
      data: {
        status: 'PROCESSING',
        startedAt: new Date()
      }
    });

    // Update progress
    await job.updateProgress(10);

    // Perform conversion
    const result = await conversionService.convertFile({
      inputPath,
      sourceFormat,
      targetFormat,
      settings,
      onProgress: (progress) => {
        job.updateProgress(Math.min(90, 10 + progress * 0.8));
      }
    });

    // Update progress
    await job.updateProgress(95);

    // Update conversion record with results
    await prisma.conversion.update({
      where: { id: conversionId },
      data: {
        status: 'COMPLETED',
        progress: 100,
        outputPath: result.outputPath,
        outputFilename: result.filename,
        outputSize: result.size,
        completedAt: new Date()
      }
    });

    // Update progress
    await job.updateProgress(100);

    logger.info('Conversion completed successfully', {
      conversionId,
      outputPath: result.outputPath,
      outputSize: result.size
    });

    return {
      success: true,
      conversionId,
      outputPath: result.outputPath,
      outputSize: result.size
    };

  } catch (error) {
    logger.error('Conversion failed', { conversionId, error: error.message });

    // Update conversion record with error
    await prisma.conversion.update({
      where: { id: conversionId },
      data: {
        status: 'FAILED',
        errorMessage: error.message,
        completedAt: new Date()
      }
    });

    // Clean up input file
    try {
      const fs = require('fs').promises;
      await fs.unlink(inputPath);
    } catch (cleanupError) {
      logger.error('Failed to cleanup input file:', cleanupError);
    }

    throw error;
  }
}, {
  connection: redis.connection,
  concurrency: 5, // Process up to 5 jobs concurrently
  removeOnComplete: 100,
  removeOnFail: 50
});

// Event handlers
conversionWorker.on('completed', (job, result) => {
  logger.info('Job completed', {
    jobId: job.id,
    conversionId: result.conversionId
  });
});

conversionWorker.on('failed', (job, error) => {
  logger.error('Job failed', {
    jobId: job.id,
    error: error.message
  });
});

conversionWorker.on('progress', (job, progress) => {
  logger.debug('Job progress', {
    jobId: job.id,
    progress
  });
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down conversion worker...');
  await conversionWorker.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  logger.info('Shutting down conversion worker...');
  await conversionWorker.close();
  await prisma.$disconnect();
  process.exit(0);
});

logger.info('Conversion worker started');

module.exports = conversionWorker;
