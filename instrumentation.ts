// Next.js 16 instrumentation — runs once at startup
// Automatically loads Sentry configs based on runtime

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const onRequestError: any = async (error: unknown, request: unknown, context: unknown) => {
  if (process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN) {
    const Sentry = await import('@sentry/nextjs');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (Sentry.captureRequestError as any)(error, request, context);
  }
};
