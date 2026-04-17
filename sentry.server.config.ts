// Sentry server-side config
// Activates when SENTRY_DSN is set

import * as Sentry from '@sentry/nextjs';

if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
    environment: process.env.VERCEL_ENV || 'development',
    debug: false,
  });
}
