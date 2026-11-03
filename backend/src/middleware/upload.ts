import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { config } from '../config';
import { UPLOAD } from '../lib/constants';
import { AppError } from './errorHandler';

/**
 * Multer configuration for production photo uploads.
 * Stores files on disk with unique filenames.
 */
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.upload.dir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${uniqueSuffix}${ext}`);
  },
});

function fileFilter(
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) {
  if (UPLOAD.ALLOWED_MIME_TYPES.includes(file.mimetype as (typeof UPLOAD.ALLOWED_MIME_TYPES)[number])) {
    cb(null, true);
  } else {
    cb(new AppError(`Invalid file type: ${file.mimetype}. Allowed: ${UPLOAD.ALLOWED_MIME_TYPES.join(', ')}`, 400));
  }
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: config.upload.maxFileSizeMB * 1024 * 1024,
    files: UPLOAD.MAX_FILES_PER_UPDATE,
  },
});
