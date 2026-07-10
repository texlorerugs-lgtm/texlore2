/**
 * Cloudinary client + upload/delete helpers.
 * All product/category images live in Cloudinary. Never on local disk.
 */
import { v2 as cloudinary, type UploadApiResponse } from 'cloudinary';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export interface CloudinaryUploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
}

/**
 * Upload a buffer (from multer.memoryStorage) to Cloudinary.
 * Applies automatic quality and format optimization.
 */
export function uploadBufferToCloudinary(
  buffer: Buffer,
  folder = 'general',
): Promise<CloudinaryUploadResult> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: `${env.CLOUDINARY_UPLOAD_FOLDER}/${folder}`,
        resource_type: 'image',
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
          { width: 2000, crop: 'limit' },
        ],
      },
      (error, result?: UploadApiResponse) => {
        if (error || !result) {
          reject(error ?? new Error('Cloudinary upload returned no result'));
          return;
        }
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
        });
      },
    );
    stream.end(buffer);
  });
}

/**
 * Delete an image from Cloudinary by its public_id.
 * Called whenever a product/category image is removed or replaced.
 */
export async function deleteCloudinaryImage(publicId: string): Promise<void> {
  try {
    const result = await cloudinary.uploader.destroy(publicId, { invalidate: true });
    if (result.result !== 'ok' && result.result !== 'not found') {
      logger.warn(`Cloudinary delete returned ${String(result.result)} for ${publicId}`);
    }
  } catch (err) {
    logger.error(`Failed to delete Cloudinary image ${publicId}`, err);
  }
}

/**
 * Upload an image from a remote URL (used by the seed script).
 */
export async function uploadUrlToCloudinary(
  url: string,
  folder = 'seed',
): Promise<CloudinaryUploadResult> {
  const result = await cloudinary.uploader.upload(url, {
    folder: `${env.CLOUDINARY_UPLOAD_FOLDER}/${folder}`,
    resource_type: 'image',
    transformation: [
      { quality: 'auto:good' },
      { fetch_format: 'auto' },
      { width: 2000, crop: 'limit' },
    ],
  });
  return {
    url: result.secure_url,
    publicId: result.public_id,
    width: result.width,
    height: result.height,
    format: result.format,
    bytes: result.bytes,
  };
}

export async function verifyCloudinary(): Promise<void> {
  try {
    // ping — cheap call that fails fast if credentials are wrong
    await cloudinary.api.ping();
    logger.info('\u2705 Cloudinary connected');
  } catch (err) {
    logger.error('Cloudinary verification failed. Check CLOUDINARY_* env vars.', err);
    throw err;
  }
}
