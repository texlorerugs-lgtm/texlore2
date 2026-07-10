/**
 * Environment variable validation.
 *
 * Enforces the Part 1 rule: "Before application starts, AI must check
 * if any required ENV variable is missing. Application should stop.
 * Display meaningful error. Never silently continue."
 *
 * Uses zod for schema validation so misconfigured deploys fail loudly.
 */
import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  // Runtime
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  API_BASE_URL: z.string().url(),
  CLIENT_URL: z.string().url(),

  // MongoDB
  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),

  // JWT
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 chars'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 chars'),
  JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('7d'),
  COOKIE_SECRET: z.string().min(16, 'COOKIE_SECRET must be at least 16 chars'),

  // Admin bootstrap
  ADMIN_NAME: z.string().min(1),
  ADMIN_EMAIL: z.string().email(),
  ADMIN_PASSWORD: z.string().min(8),
  ADMIN_SECRET_KEY: z.string().min(16, 'ADMIN_SECRET_KEY must be at least 16 chars'),

  // Cloudinary
  CLOUDINARY_CLOUD_NAME: z.string().min(1),
  CLOUDINARY_API_KEY: z.string().min(1),
  CLOUDINARY_API_SECRET: z.string().min(1),
  CLOUDINARY_UPLOAD_FOLDER: z.string().default('texlore'),

  // SMTP
  RESEND_API_KEY: z.string().min(1, 'RESEND_API_KEY is required'),
EMAIL_FROM_NAME: z.string().default('Texlore'),
EMAIL_FROM_EMAIL: z.string().email(),

  // Razorpay
  RAZORPAY_KEY_ID: z.string().min(1),
  RAZORPAY_KEY_SECRET: z.string().min(1),
  RAZORPAY_WEBHOOK_SECRET: z.string().min(1),

  // Currency
  SUPPORTED_CURRENCIES: z.string().default('INR,USD'),
  DEFAULT_CURRENCY: z.enum(['INR', 'USD']).default('INR'),

  // Rate limit
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(900_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(200),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().positive().default(10),

  // OTP
  OTP_LENGTH: z.coerce.number().int().min(4).max(8).default(6),
  OTP_EXPIRY_MINUTES: z.coerce.number().int().positive().default(5),
  OTP_MAX_RESEND: z.coerce.number().int().positive().default(3),
  OTP_RESEND_COOLDOWN_SECONDS: z.coerce.number().int().positive().default(60),

  // Admin lockout
  ADMIN_MAX_FAILED_ATTEMPTS: z.coerce.number().int().positive().default(5),
  ADMIN_LOCKOUT_MINUTES: z.coerce.number().int().positive().default(15),
});

export type Env = z.infer<typeof envSchema>;

function loadEnv(): Env {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    // Print a clean, developer-friendly error and hard-exit.
    // Do NOT silently continue with partial config.
    // eslint-disable-next-line no-console
    console.error('\n\u274C  Invalid or missing environment variables:\n');
    for (const issue of parsed.error.issues) {
      // eslint-disable-next-line no-console
      console.error(`   \u2022 ${issue.path.join('.')}: ${issue.message}`);
    }
    // eslint-disable-next-line no-console
    console.error('\nPlease check your .env file against .env.example.\n');
    process.exit(1);
  }

  return parsed.data;
}

export const env: Env = loadEnv();

export const isProd = env.NODE_ENV === 'production';
export const isDev = env.NODE_ENV === 'development';
export const isTest = env.NODE_ENV === 'test';

export const supportedCurrencies = env.SUPPORTED_CURRENCIES.split(',').map((c) =>
  c.trim().toUpperCase(),
);
