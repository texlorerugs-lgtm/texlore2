/**
 * MongoDB Atlas connection.
 * Retries on initial failure. Never falls back to local storage.
 */
import mongoose from 'mongoose';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

mongoose.set('strictQuery', true);
// NOTE: `sanitizeFilter: true` was removed — it rejects internally-generated
// queries containing ObjectId strings in $in / $ne operators, breaking cart
// lookups, related products, etc. NoSQL injection is already prevented by
// the `express-mongo-sanitize` middleware which strips $-prefixed keys from
// user input at the HTTP boundary.

export async function connectDatabase(): Promise<void> {
  const maxAttempts = 5;
  let attempt = 0;

  while (attempt < maxAttempts) {
    try {
      attempt += 1;
      await mongoose.connect(env.MONGO_URI, {
        serverSelectionTimeoutMS: 10_000,
        maxPoolSize: 20,
        minPoolSize: 2,
        retryWrites: true,
      });
      logger.info(`\u2705 MongoDB connected (attempt ${attempt})`);
      break;
    } catch (err) {
      logger.error(`MongoDB connection failed (attempt ${attempt}/${maxAttempts})`, err);
      if (attempt >= maxAttempts) {
        logger.error('Giving up on MongoDB connection. Exiting.');
        process.exit(1);
      }
      await new Promise((r) => setTimeout(r, 3_000 * attempt));
    }
  }

  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });
  mongoose.connection.on('reconnected', () => {
    logger.info('MongoDB reconnected');
  });
  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error', err);
  });
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  logger.info('MongoDB disconnected cleanly');
}
