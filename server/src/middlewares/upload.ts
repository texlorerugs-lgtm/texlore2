/**
 * Multer memory storage with strict file-type + size validation.
 * Buffers are handed off to Cloudinary — nothing touches local disk.
 */
import multer, { type FileFilterCallback } from 'multer';
import type { Request } from 'express';
import { ApiError } from '@/utils/ApiError';

const ALLOWED_MIME = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB per file
const MAX_FILES = 7;

function fileFilter(_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void {
  if (!ALLOWED_MIME.has(file.mimetype)) {
    cb(ApiError.badRequest(`Unsupported file type: ${file.mimetype}`));
    return;
  }
  cb(null, true);
}

export const uploadImages = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: MAX_BYTES, files: MAX_FILES },
});
