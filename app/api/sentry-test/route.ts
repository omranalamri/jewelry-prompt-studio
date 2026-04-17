// Test endpoint — throws an error to verify Sentry is capturing
// GET /api/sentry-test

export async function GET() {
  try {
    throw new Error('Sentry test error from /api/sentry-test — if you see this in Sentry, it works!');
  } catch (err) {
    const Sentry = await import('@sentry/nextjs');
    Sentry.captureException(err);
    return Response.json({
      message: 'Test error captured. Check https://caleums.sentry.io/issues',
      capturedBy: process.env.SENTRY_DSN ? 'Sentry (configured)' : 'Local console only',
    });
  }
}
