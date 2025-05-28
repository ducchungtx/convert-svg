const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const mime = require('mime-types');
const FileType = require('file-type');
const logger = require('../utils/logger');

// Allowed file types and their MIME types
const ALLOWED_TYPES = {
  'image/svg+xml': ['.svg'],
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/jpg': ['.jpg', '.jpeg'],
  'application/pdf': ['.pdf'],
  'application/postscript': ['.eps', '.ps'],
  'image/x-eps': ['.eps']
};

// Maximum file sizes (in bytes)
const MAX_FILE_SIZES = {
  SVG: 10 * 1024 * 1024,  // 10MB for SVG
  IMAGE: 50 * 1024 * 1024, // 50MB for images
  PDF: 100 * 1024 * 1024,  // 100MB for PDF
  EPS: 100 * 1024 * 1024   // 100MB for EPS
};

/**
 * Ensure upload directories exist
 */
const ensureUploadDirs = async () => {
  const dirs = [
    'uploads/temp',
    'uploads/converted',
    'uploads/originals'
  ];

  for (const dir of dirs) {
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
      logger.info(`Created directory: ${dir}`);
    }
  }
};

/**
 * Custom storage configuration
 */
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    await ensureUploadDirs();
    cb(null, 'uploads/temp');
  },
  filename: (req, file, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

/**
 * File filter function
 */
const fileFilter = (req, file, cb) => {
  const mimeType = file.mimetype.toLowerCase();
  const ext = path.extname(file.originalname).toLowerCase();

  // Check if MIME type is allowed
  if (!ALLOWED_TYPES[mimeType]) {
    return cb(new Error(`File type ${mimeType} not supported`), false);
  }

  // Check if extension matches MIME type
  if (!ALLOWED_TYPES[mimeType].includes(ext)) {
    return cb(new Error(`File extension ${ext} doesn't match MIME type ${mimeType}`), false);
  }

  cb(null, true);
};

/**
 * Get file size limit based on type
 */
const getFileSize = (mimeType) => {
  if (mimeType === 'image/svg+xml') return MAX_FILE_SIZES.SVG;
  if (mimeType === 'application/pdf') return MAX_FILE_SIZES.PDF;
  if (mimeType.includes('postscript') || mimeType.includes('eps')) return MAX_FILE_SIZES.EPS;
  return MAX_FILE_SIZES.IMAGE;
};

/**
 * Create multer upload middleware
 */
const createUpload = (fieldName = 'file') => {
  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: Math.max(...Object.values(MAX_FILE_SIZES)),
      files: 1,
      fields: 10
    }
  }).single(fieldName);
};

/**
 * File validation middleware
 */
const validateFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded'
      });
    }

    const file = req.file;

    // Additional file type validation using file-type
    const fileTypeResult = await FileType.fromFile(file.path);

    if (fileTypeResult) {
      const detectedMime = fileTypeResult.mime;
      const declaredMime = file.mimetype;

      // For SVG files, file-type might not detect them properly
      if (declaredMime === 'image/svg+xml') {
        // Read first few bytes to check for SVG signature
        const buffer = await fs.readFile(file.path, { encoding: 'utf8' });
        const isSvg = buffer.trim().startsWith('<svg') || buffer.includes('<svg');

        if (!isSvg) {
          await fs.unlink(file.path); // Clean up
          return res.status(400).json({
            success: false,
            message: 'File is not a valid SVG'
          });
        }
      } else if (detectedMime !== declaredMime) {
        await fs.unlink(file.path); // Clean up
        return res.status(400).json({
          success: false,
          message: `File type mismatch. Expected: ${declaredMime}, Detected: ${detectedMime}`
        });
      }
    }

    // Check file size against type-specific limits
    const maxSize = getFileSize(file.mimetype);
    if (file.size > maxSize) {
      await fs.unlink(file.path); // Clean up
      return res.status(400).json({
        success: false,
        message: `File too large. Maximum size: ${Math.round(maxSize / (1024 * 1024))}MB`
      });
    }

    // Add file info to request
    req.fileInfo = {
      id: path.parse(file.filename).name,
      originalName: file.originalname,
      mimeType: file.mimetype,
      size: file.size,
      extension: path.extname(file.originalname),
      tempPath: file.path
    };

    logger.info('File validated successfully', {
      filename: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });

    next();
  } catch (error) {
    logger.error('File validation error:', error);

    // Clean up file if validation fails
    if (req.file && req.file.path) {
      try {
        await fs.unlink(req.file.path);
      } catch (unlinkError) {
        logger.error('Failed to clean up file:', unlinkError);
      }
    }

    res.status(500).json({
      success: false,
      message: 'File validation failed'
    });
  }
};

/**
 * Clean up temporary files
 */
const cleanupTempFile = async (filePath) => {
  try {
    await fs.unlink(filePath);
    logger.info(`Cleaned up temp file: ${filePath}`);
  } catch (error) {
    logger.error(`Failed to cleanup temp file ${filePath}:`, error);
  }
};

/**
 * Clean up old files (older than 24 hours)
 */
const cleanupOldFiles = async () => {
  try {
    const tempDir = 'uploads/temp';
    const files = await fs.readdir(tempDir);
    const now = Date.now();
    const maxAge = 24 * 60 * 60 * 1000; // 24 hours

    for (const file of files) {
      const filePath = path.join(tempDir, file);
      const stats = await fs.stat(filePath);

      if (now - stats.mtime.getTime() > maxAge) {
        await fs.unlink(filePath);
        logger.info(`Cleaned up old file: ${filePath}`);
      }
    }
  } catch (error) {
    logger.error('Error cleaning up old files:', error);
  }
};

// Run cleanup every hour
setInterval(cleanupOldFiles, 60 * 60 * 1000);

module.exports = {
  upload: createUpload(),
  uploadWithField: createUpload,
  validateFile,
  cleanupTempFile,
  cleanupOldFiles,
  ALLOWED_TYPES,
  MAX_FILE_SIZES
};
