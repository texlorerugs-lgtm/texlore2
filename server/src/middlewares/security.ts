/**
 * Aggregates security middleware: helmet, hpp, mongo sanitize, xss clean.
 * Applied globally in app.ts.
 */
import type { Application, RequestHandler } from 'express';
import helmet from 'helmet';
import hpp from 'hpp';
import mongoSanitize from 'express-mongo-sanitize';
// xss-clean has no types; import via require to keep TS happy
// eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires
const xssClean: () => RequestHandler = require('xss-clean');

export function applySecurity(app: Application): void {
  app.use(
    helmet({
      contentSecurityPolicy: false, // handled at edge / meta tags for the SPA
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    }),
  );
  app.use(mongoSanitize());
  app.use(xssClean());
  app.use(hpp());
}
