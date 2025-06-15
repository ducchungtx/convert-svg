const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');

/**
 * Simple conversion service using Sharp only (no canvas dependency)
 */
class SimpleConversionService {
  constructor() {
    this.outputDir = 'uploads/converted';
    this.ensureOutputDir();
  }

  async ensureOutputDir() {
    try {
      await fs.access(this.outputDir);
    } catch {
      await fs.mkdir(this.outputDir, { recursive: true });
    }
  }

  /**
   * Convert file based on source and target formats
   */
  async convertFile({ inputPath, sourceFormat, targetFormat, settings = {}, onProgress }) {
    logger.info('Starting conversion', { sourceFormat, targetFormat, inputPath });

    if (onProgress) onProgress(0);

    try {
      let result;

      // Route to appropriate conversion method
      switch (`${sourceFormat}_TO_${targetFormat}`) {
        // SVG conversions using Sharp
        case 'SVG_TO_PNG':
        case 'SVG_TO_JPG':
        case 'SVG_TO_JPEG':
          result = await this.convertSvgToRasterSharp(inputPath, targetFormat, settings, onProgress);
          break;

        // Raster to raster using Sharp
        case 'PNG_TO_JPG':
        case 'PNG_TO_JPEG':
        case 'JPG_TO_PNG':
        case 'JPEG_TO_PNG':
          result = await this.convertRasterToRaster(inputPath, sourceFormat, targetFormat, settings, onProgress);
          break;

        default:
          throw new Error(`Conversion from ${sourceFormat} to ${targetFormat} not supported in simple mode`);
      }

      if (onProgress) onProgress(100);

      // Clean up input file
      try {
        await fs.unlink(inputPath);
      } catch (error) {
        logger.warn('Failed to cleanup input file:', error);
      }

      return result;
    } catch (error) {
      logger.error('Conversion failed:', error);

      // Clean up on error
      try {
        await fs.unlink(inputPath);
      } catch (cleanupError) {
        logger.warn('Failed to cleanup input file after error:', cleanupError);
      }

      throw error;
    }
  }

  /**
   * Convert SVG to raster using Sharp
   */
  async convertSvgToRasterSharp(inputPath, targetFormat, settings, onProgress) {
    if (onProgress) onProgress(25);

    const outputFilename = `${uuidv4()}.${targetFormat.toLowerCase()}`;
    const outputPath = path.join(this.outputDir, outputFilename);

    try {
      let sharpInstance = sharp(inputPath, {
        density: settings.dpi || 300 // Higher DPI for better quality
      });

      // Set dimensions if provided
      if (settings.width || settings.height) {
        sharpInstance = sharpInstance.resize(settings.width, settings.height, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      if (onProgress) onProgress(50);

      // Convert based on target format
      switch (targetFormat.toUpperCase()) {
        case 'PNG':
          await sharpInstance.png({
            quality: settings.quality || 90,
            compressionLevel: 6
          }).toFile(outputPath);
          break;

        case 'JPG':
        case 'JPEG':
          await sharpInstance.jpeg({
            quality: settings.quality || 90,
            progressive: true
          }).toFile(outputPath);
          break;

        default:
          throw new Error(`Unsupported target format: ${targetFormat}`);
      }

      if (onProgress) onProgress(75);

      // Get file stats
      const stats = await fs.stat(outputPath);

      return {
        outputPath,
        outputSize: stats.size,
        outputFilename,
        format: targetFormat.toUpperCase()
      };

    } catch (error) {
      // Clean up output file if conversion failed
      try {
        await fs.unlink(outputPath);
      } catch (cleanupError) {
        logger.warn('Failed to cleanup output file:', cleanupError);
      }
      throw error;
    }
  }

  /**
   * Convert raster to raster using Sharp
   */
  async convertRasterToRaster(inputPath, sourceFormat, targetFormat, settings, onProgress) {
    if (onProgress) onProgress(25);

    const outputFilename = `${uuidv4()}.${targetFormat.toLowerCase()}`;
    const outputPath = path.join(this.outputDir, outputFilename);

    try {
      let sharpInstance = sharp(inputPath);

      // Set dimensions if provided
      if (settings.width || settings.height) {
        sharpInstance = sharpInstance.resize(settings.width, settings.height, {
          fit: 'inside',
          withoutEnlargement: true
        });
      }

      if (onProgress) onProgress(50);

      // Convert based on target format
      switch (targetFormat.toUpperCase()) {
        case 'PNG':
          await sharpInstance.png({
            quality: settings.quality || 90,
            compressionLevel: 6
          }).toFile(outputPath);
          break;

        case 'JPG':
        case 'JPEG':
          await sharpInstance.jpeg({
            quality: settings.quality || 90,
            progressive: true
          }).toFile(outputPath);
          break;

        default:
          throw new Error(`Unsupported target format: ${targetFormat}`);
      }

      if (onProgress) onProgress(75);

      // Get file stats
      const stats = await fs.stat(outputPath);

      return {
        outputPath,
        outputSize: stats.size,
        outputFilename,
        format: targetFormat.toUpperCase()
      };

    } catch (error) {
      // Clean up output file if conversion failed
      try {
        await fs.unlink(outputPath);
      } catch (cleanupError) {
        logger.warn('Failed to cleanup output file:', cleanupError);
      }
      throw error;
    }
  }
}

module.exports = new SimpleConversionService();
