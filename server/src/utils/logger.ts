/**
 * Winston-based structured logger.
 * Never `console.log` in production code — use this instead.
 */
import winston from 'winston';
import { env, isProd } from '@/config/env';

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// Include extra metadata fields (field, value, kind, path, etc.) so
// diagnostic warnings like "Mongoose CastError { field, value, ... }" are
// actually visible in the dev console.
const devFormat = printf((info) => {
  const { level, message, timestamp: ts, stack } = info;
  const {
    level: _l,
    message: _m,
    timestamp: _t,
    stack: _s,
    splat: _sp,
    ...rest
  } = info as Record<string, unknown>;
  void _l; void _m; void _t; void _s; void _sp;
  const extra = Object.keys(rest).length ? ' ' + JSON.stringify(rest) : '';
  return `${ts as string} [${level}] ${stack ?? message}${extra}`;
});

export const logger = winston.createLogger({
  level: isProd ? 'info' : 'debug',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    isProd ? json() : combine(colorize(), devFormat),
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 5 * 1024 * 1024,
      maxFiles: 5,
    }),
  ],
  exitOnError: false,
});

// Silence noisy Winston deprecation notes; env is imported to ensure validation runs
void env;
