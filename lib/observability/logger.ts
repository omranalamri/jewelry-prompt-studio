// Observability — structured logger + Sentry integration
// Sentry activates automatically when SENTRY_DSN is set

import * as Sentry from '@sentry/nextjs';

interface LogContext {
  route?: string;
  userId?: string;
  tenantId?: string;
  [key: string]: unknown;
}

export function logError(error: unknown, context?: LogContext) {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  // eslint-disable-next-line no-console
  console.error('[ERROR]', { message, stack, ...context });

  // Forward to Sentry if configured
  if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.captureException(error, { extra: context });
  }
}

export function logInfo(message: string, context?: LogContext) {
  // eslint-disable-next-line no-console
  console.log('[INFO]', message, context);
}
