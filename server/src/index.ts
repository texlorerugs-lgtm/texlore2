/// <reference path="./types/express.d.ts" />
/**
 * Server entrypoint.
 * Order:
 *   1. Validate env (side-effect of importing env.ts)
 *   2. Connect Mongo
 *   3. Verify Cloudinary
 *   4. Verify SMTP
 *   5. Start HTTP server
 *   6. Register graceful shutdown handlers
 */
import { env } from '@/config/env';
import { connectDatabase, disconnectDatabase } from '@/config/db';
import { verifyCloudinary } from '@/config/cloudinary';
import { verifyMailer } from '@/config/mailer';
import { createApp } from '@/app';
import { logger } from '@/utils/logger';

async function bootstrap(): Promise<void> {
  logger.info(`\uD83D\uDE80 Starting Texlore API in ${env.NODE_ENV} mode`);

  await connectDatabase();

  // These verifications catch bad credentials at startup instead of at first use.
  // If Cloudinary/SMTP are unreachable, we log a warning but do not crash — the
  // app can still serve reads. Payment/OTP calls will surface their own errors.
  try {
    await verifyCloudinary();
  } catch {
    logger.warn('\u26A0\uFE0F  Continuing without verified Cloudinary. Image uploads will fail.');
  }
  try {
    await verifyMailer();
  } catch {
    logger.warn('\u26A0\uFE0F  Continuing without verified SMTP. Emails will fail.');
  }

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`\u2705 Texlore API listening on ${env.API_BASE_URL} (port ${env.PORT})`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    server.close(async () => {
      await disconnectDatabase();
      process.exit(0);
    });
    // Force exit if not closed in 10s
    setTimeout(() => {
      logger.error('Forced shutdown after 10s');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', reason);
  });
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception', err);
    // Exit — process is in unknown state
    process.exit(1);
  });
}

void bootstrap();
