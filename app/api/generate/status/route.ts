import { NextRequest } from 'next/server';
import Replicate from 'replicate';
import { getDb } from '@/lib/db';

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const predictionId = searchParams.get('id');
    const provider = searchParams.get('provider') || 'replicate';

    if (!predictionId) {
      return errorResponse('MISSING_ID', 'No prediction ID provided.', 400);
    }

    // Runway task polling
    if (provider === 'runway') {
      const apiKey = process.env.RUNWAYML_API_SECRET;
      if (!apiKey) return errorResponse('NOT_CONFIGURED', 'Runway not configured.', 503);

      const response = await fetch(`https://api.dev.runwayml.com/v1/tasks/${predictionId}`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-Runway-Version': '2024-11-06',
        },
      });

      if (!response.ok) {
        return errorResponse('STATUS_ERROR', 'Could not check Runway status.', 500);
      }

      const data = await response.json();

      let status: string;
      switch (data.status) {
        case 'SUCCEEDED': status = 'completed'; break;
        case 'FAILED': status = 'failed'; break;
        case 'RUNNING': status = 'processing'; break;
        default: status = 'queued';
      }

      const resultUrl = data.output?.[0] || null;

      // Auto-save completed videos to repository
      if (status === 'completed' && resultUrl) {
        try {
          const sql = getDb();
          await sql`INSERT INTO repository (category, title, description, image_url, tags, metadata, model_used)
            SELECT 'generated', ${'Runway Video — ' + new Date().toLocaleDateString()}, '', ${resultUrl}, ${['video', 'runway']}, '{}', 'Runway Gen-3'
            WHERE NOT EXISTS (SELECT 1 FROM repository WHERE image_url = ${resultUrl})`;
        } catch { /* non-critical */ }
      }

      return Response.json({
        success: true,
        data: { id: predictionId, status, resultUrl, error: data.failure || null },
      });
    }

    // Replicate prediction polling
    if (provider === 'replicate') {
      if (!process.env.REPLICATE_API_TOKEN) {
        return errorResponse('NOT_CONFIGURED', 'Replicate not configured.', 503);
      }

      const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
      const prediction = await replicate.predictions.get(predictionId);

      let status: string;
      switch (prediction.status) {
        case 'succeeded': status = 'completed'; break;
        case 'failed':
        case 'canceled': status = 'failed'; break;
        case 'processing': status = 'processing'; break;
        default: status = 'queued';
      }

      let resultUrl: string | null = null;
      if (prediction.output) {
        if (typeof prediction.output === 'string') {
          resultUrl = prediction.output;
        } else if (Array.isArray(prediction.output) && prediction.output.length > 0) {
          resultUrl = String(prediction.output[0]);
        }
      }

      // Auto-save completed videos to repository
      if (status === 'completed' && resultUrl) {
        try {
          const sql = getDb();
          const model = (prediction as unknown as Record<string, unknown>).model as string || 'video';
          await sql`INSERT INTO repository (category, title, description, image_url, tags, metadata, model_used)
            SELECT 'generated', ${(model || 'Video') + ' — ' + new Date().toLocaleDateString()}, '', ${resultUrl}, ${['video', model || 'replicate']}, '{}', ${model || 'replicate'}
            WHERE NOT EXISTS (SELECT 1 FROM repository WHERE image_url = ${resultUrl})`;
        } catch { /* non-critical */ }
      }

      return Response.json({
        success: true,
        data: { id: predictionId, status, resultUrl, error: prediction.error || null },
      });
    }

    return errorResponse('UNKNOWN_PROVIDER', 'Unknown provider.', 400);
  } catch (error) {
    console.error('Status check error:', error);
    return errorResponse('UNKNOWN', 'Could not check generation status.', 500);
  }
}
