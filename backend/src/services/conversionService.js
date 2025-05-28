const sharp = require('sharp');
const { createCanvas, loadImage } = require('canvas');
const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { exec } = require('child_process');
const { promisify } = require('util');
const logger = require('../utils/logger');

const execAsync = promisify(exec);

/**
 * Main conversion service
 */
class ConversionService {
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
        // SVG conversions
        case 'SVG_TO_PNG':
        case 'SVG_TO_JPG':
        case 'SVG_TO_JPEG':
          result = await this.convertSvgToRaster(inputPath, targetFormat, settings, onProgress);
          break;

        case 'SVG_TO_PDF':
          result = await this.convertSvgToPdf(inputPath, settings, onProgress);
          break;

        // Raster to SVG
        case 'PNG_TO_SVG':
        case 'JPG_TO_SVG':
        case 'JPEG_TO_SVG':
          result = await this.convertRasterToSvg(inputPath, sourceFormat, settings, onProgress);
          break;

        // Raster to raster
        case 'PNG_TO_JPG':
        case 'PNG_TO_JPEG':
        case 'JPG_TO_PNG':
        case 'JPEG_TO_PNG':
          result = await this.convertRasterToRaster(inputPath, sourceFormat, targetFormat, settings, onProgress);
          break;

        // EPS conversions
        case 'EPS_TO_SVG':
          result = await this.convertEpsToSvg(inputPath, settings, onProgress);
          break;

        case 'EPS_TO_PNG':
        case 'EPS_TO_JPG':
        case 'EPS_TO_JPEG':
          result = await this.convertEpsToRaster(inputPath, targetFormat, settings, onProgress);
          break;

        case 'EPS_TO_PDF':
          result = await this.convertEpsToPdf(inputPath, settings, onProgress);
          break;

        // PDF conversions
        case 'PDF_TO_SVG':
        case 'PDF_TO_PNG':
        case 'PDF_TO_JPG':
        case 'PDF_TO_JPEG':
          result = await this.convertPdfToOther(inputPath, targetFormat, settings, onProgress);
          break;

        default:
          throw new Error(`Conversion from ${sourceFormat} to ${targetFormat} not supported`);
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
      throw error;
    }
  }

  /**
   * Convert SVG to raster formats (PNG, JPG)
   */
  async convertSvgToRaster(inputPath, targetFormat, settings, onProgress) {
    if (onProgress) onProgress(20);

    const outputFilename = `${uuidv4()}.${targetFormat.toLowerCase()}`;
    const outputPath = path.join(this.outputDir, outputFilename);

    try {
      // Read SVG content
      const svgBuffer = await fs.readFile(inputPath);

      if (onProgress) onProgress(40);

      // Create Sharp instance from SVG
      let sharpInstance = sharp(svgBuffer);

      // Apply dimensions if specified
      if (settings.width || settings.height) {
        sharpInstance = sharpInstance.resize(settings.width, settings.height, {
          fit: 'inside',
          withoutEnlargement: false
        });
      }

      if (onProgress) onProgress(60);

      // Convert based on target format
      if (targetFormat === 'PNG') {
        await sharpInstance.png({ quality: 100 }).toFile(outputPath);
      } else {
        const quality = settings.quality || 90;
        await sharpInstance.jpeg({ quality }).toFile(outputPath);
      }

      if (onProgress) onProgress(80);

      const stats = await fs.stat(outputPath);

      return {
        outputPath,
        filename: outputFilename,
        size: stats.size
      };
    } catch (error) {
      // Fallback to ImageMagick for complex SVGs
      logger.warn('Sharp conversion failed, trying ImageMagick:', error.message);
      return await this.convertSvgWithImageMagick(inputPath, targetFormat, settings, onProgress);
    }
  }

  /**
   * Convert SVG using ImageMagick (fallback)
   */
  async convertSvgWithImageMagick(inputPath, targetFormat, settings, onProgress) {
    const outputFilename = `${uuidv4()}.${targetFormat.toLowerCase()}`;
    const outputPath = path.join(this.outputDir, outputFilename);

    let command = `convert "${inputPath}"`;

    // Add density for better quality
    command = `convert -density 300 "${inputPath}"`;

    // Apply dimensions
    if (settings.width && settings.height) {
      command += ` -resize ${settings.width}x${settings.height}`;
    } else if (settings.width) {
      command += ` -resize ${settings.width}x`;
    } else if (settings.height) {
      command += ` -resize x${settings.height}`;
    }

    // Set quality for JPEG
    if (targetFormat === 'JPG' || targetFormat === 'JPEG') {
      const quality = settings.quality || 90;
      command += ` -quality ${quality}`;
    }

    command += ` "${outputPath}"`;

    if (onProgress) onProgress(60);

    await execAsync(command);

    if (onProgress) onProgress(80);

    const stats = await fs.stat(outputPath);

    return {
      outputPath,
      filename: outputFilename,
      size: stats.size
    };
  }

  /**
   * Convert SVG to PDF
   */
  async convertSvgToPdf(inputPath, settings, onProgress) {
    const outputFilename = `${uuidv4()}.pdf`;
    const outputPath = path.join(this.outputDir, outputFilename);

    if (onProgress) onProgress(40);

    // Use ImageMagick to convert SVG to PDF
    let command = `convert -density 300 "${inputPath}"`;

    if (settings.width && settings.height) {
      command += ` -resize ${settings.width}x${settings.height}`;
    }

    command += ` "${outputPath}"`;

    if (onProgress) onProgress(60);

    await execAsync(command);

    if (onProgress) onProgress(80);

    const stats = await fs.stat(outputPath);

    return {
      outputPath,
      filename: outputFilename,
      size: stats.size
    };
  }

  /**
   * Convert raster images to SVG (tracing)
   */
  async convertRasterToSvg(inputPath, sourceFormat, settings, onProgress) {
    const outputFilename = `${uuidv4()}.svg`;
    const outputPath = path.join(this.outputDir, outputFilename);

    if (onProgress) onProgress(30);

    // Use potrace for bitmap tracing
    const potrace = require('potrace');

    // First convert to bitmap if needed
    let bitmapPath = inputPath;
    if (sourceFormat === 'JPG' || sourceFormat === 'JPEG') {
      // Convert JPEG to PNG first (potrace works better with PNG)
      const tempPngPath = `${inputPath}.temp.png`;
      await sharp(inputPath).png().toFile(tempPngPath);
      bitmapPath = tempPngPath;
    }

    if (onProgress) onProgress(50);

    return new Promise((resolve, reject) => {
      potrace.trace(bitmapPath, {
        color: 'black',
        background: 'transparent',
        threshold: settings.threshold || 128
      }, async (err, svg) => {
        try {
          if (err) throw err;

          if (onProgress) onProgress(70);

          // Write SVG to file
          await fs.writeFile(outputPath, svg);

          if (onProgress) onProgress(80);

          // Clean up temp file if created
          if (bitmapPath !== inputPath) {
            await fs.unlink(bitmapPath).catch(() => { });
          }

          const stats = await fs.stat(outputPath);

          resolve({
            outputPath,
            filename: outputFilename,
            size: stats.size
          });
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Convert between raster formats
   */
  async convertRasterToRaster(inputPath, sourceFormat, targetFormat, settings, onProgress) {
    const outputFilename = `${uuidv4()}.${targetFormat.toLowerCase()}`;
    const outputPath = path.join(this.outputDir, outputFilename);

    if (onProgress) onProgress(40);

    let sharpInstance = sharp(inputPath);

    // Apply dimensions if specified
    if (settings.width || settings.height) {
      sharpInstance = sharpInstance.resize(settings.width, settings.height, {
        fit: 'inside',
        withoutEnlargement: false
      });
    }

    if (onProgress) onProgress(60);

    // Convert based on target format
    if (targetFormat === 'PNG') {
      await sharpInstance.png({ quality: 100 }).toFile(outputPath);
    } else {
      const quality = settings.quality || 90;
      await sharpInstance.jpeg({ quality }).toFile(outputPath);
    }

    if (onProgress) onProgress(80);

    const stats = await fs.stat(outputPath);

    return {
      outputPath,
      filename: outputFilename,
      size: stats.size
    };
  }

  /**
   * Convert EPS to SVG
   */
  async convertEpsToSvg(inputPath, settings, onProgress) {
    const outputFilename = `${uuidv4()}.svg`;
    const outputPath = path.join(this.outputDir, outputFilename);

    if (onProgress) onProgress(40);

    // Use Ghostscript to convert EPS to SVG
    const command = `gs -dNOPAUSE -dBATCH -sDEVICE=svg -sOutputFile="${outputPath}" "${inputPath}"`;

    if (onProgress) onProgress(60);

    await execAsync(command);

    if (onProgress) onProgress(80);

    const stats = await fs.stat(outputPath);

    return {
      outputPath,
      filename: outputFilename,
      size: stats.size
    };
  }

  /**
   * Convert EPS to raster formats
   */
  async convertEpsToRaster(inputPath, targetFormat, settings, onProgress) {
    const outputFilename = `${uuidv4()}.${targetFormat.toLowerCase()}`;
    const outputPath = path.join(this.outputDir, outputFilename);

    if (onProgress) onProgress(40);

    let command = `gs -dNOPAUSE -dBATCH -sDEVICE=png16m -r300`;

    if (settings.width && settings.height) {
      command += ` -g${settings.width}x${settings.height}`;
    }

    command += ` -sOutputFile="${outputPath}" "${inputPath}"`;

    if (onProgress) onProgress(60);

    await execAsync(command);

    // Convert PNG to target format if needed
    if (targetFormat === 'JPG' || targetFormat === 'JPEG') {
      const tempPath = outputPath;
      const finalOutputFilename = `${uuidv4()}.${targetFormat.toLowerCase()}`;
      const finalOutputPath = path.join(this.outputDir, finalOutputFilename);

      const quality = settings.quality || 90;
      await sharp(tempPath).jpeg({ quality }).toFile(finalOutputPath);

      await fs.unlink(tempPath); // Clean up temp PNG

      if (onProgress) onProgress(80);

      const stats = await fs.stat(finalOutputPath);

      return {
        outputPath: finalOutputPath,
        filename: finalOutputFilename,
        size: stats.size
      };
    }

    if (onProgress) onProgress(80);

    const stats = await fs.stat(outputPath);

    return {
      outputPath,
      filename: outputFilename,
      size: stats.size
    };
  }

  /**
   * Convert EPS to PDF
   */
  async convertEpsToPdf(inputPath, settings, onProgress) {
    const outputFilename = `${uuidv4()}.pdf`;
    const outputPath = path.join(this.outputDir, outputFilename);

    if (onProgress) onProgress(40);

    const command = `gs -dNOPAUSE -dBATCH -sDEVICE=pdfwrite -sOutputFile="${outputPath}" "${inputPath}"`;

    if (onProgress) onProgress(60);

    await execAsync(command);

    if (onProgress) onProgress(80);

    const stats = await fs.stat(outputPath);

    return {
      outputPath,
      filename: outputFilename,
      size: stats.size
    };
  }

  /**
   * Convert PDF to other formats
   */
  async convertPdfToOther(inputPath, targetFormat, settings, onProgress) {
    const outputFilename = `${uuidv4()}.${targetFormat.toLowerCase()}`;
    const outputPath = path.join(this.outputDir, outputFilename);

    if (onProgress) onProgress(40);

    const page = settings.page || 1; // Default to first page
    let command;

    if (targetFormat === 'SVG') {
      command = `pdf2svg "${inputPath}" "${outputPath}" ${page}`;
    } else {
      // Convert to raster format
      const density = settings.density || 300;
      command = `convert -density ${density} "${inputPath}[${page - 1}]"`; // ImageMagick uses 0-based page index

      if (settings.width && settings.height) {
        command += ` -resize ${settings.width}x${settings.height}`;
      }

      if (targetFormat === 'JPG' || targetFormat === 'JPEG') {
        const quality = settings.quality || 90;
        command += ` -quality ${quality}`;
      }

      command += ` "${outputPath}"`;
    }

    if (onProgress) onProgress(60);

    await execAsync(command);

    if (onProgress) onProgress(80);

    const stats = await fs.stat(outputPath);

    return {
      outputPath,
      filename: outputFilename,
      size: stats.size
    };
  }
}

module.exports = new ConversionService();
