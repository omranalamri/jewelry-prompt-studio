import { NextRequest } from 'next/server';

export const maxDuration = 120;

// This endpoint is designed to be called by a Vercel Cron Job
// Schedule: weekly scan for new models
// Configure in vercel.json: { "crons": [{ "path": "/api/cron/scan-models", "schedule": "0 9 * * 1" }] }

export async function GET(req: NextRequest) {
  // Verify cron secret if set
  const authHeader = req.headers.get('authorization');
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Trigger the model discovery scan
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://jewelry-prompt-studio.vercel.app';

    const scanRes = await fetch(`${baseUrl}/api/model-discovery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'scan' }),
    });

    const scanData = await scanRes.json();

    // Also refresh combo performance from learning data
    try {
      await fetch(`${baseUrl}/api/learn`, { method: 'POST' });
    } catch { /* non-critical */ }

    return Response.json({
      success: true,
      data: {
        modelsScanned: scanData?.data?.scanned || 0,
        modelsUpdated: scanData?.data?.updated || 0,
        timestamp: new Date().toISOString(),
        nextRun: 'Next Monday at 9:00 AM UTC',
      },
    });
  } catch (error) {
    console.error('Cron scan error:', error);
    return Response.json({ success: false, error: 'Scan failed.' }, { status: 500 });
  }
}
