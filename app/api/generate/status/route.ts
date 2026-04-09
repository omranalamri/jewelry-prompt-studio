import { NextRequest } from 'next/server';
import Replicate from 'replicate';

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

    if (provider === 'replicate') {
      if (!process.env.REPLICATE_API_TOKEN) {
        return errorResponse('NOT_CONFIGURED', 'Replicate not configured.', 503);
      }

      const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
      const prediction = await replicate.predictions.get(predictionId);

      let status: string;
      switch (prediction.status) {
        case 'succeeded':
          status = 'completed';
          break;
        case 'failed':
        case 'canceled':
          status = 'failed';
          break;
        case 'processing':
          status = 'processing';
          break;
        default:
          status = 'queued';
      }

      // Output can be a string URL or array of URLs
      let resultUrl: string | null = null;
      if (prediction.output) {
        if (typeof prediction.output === 'string') {
          resultUrl = prediction.output;
        } else if (Array.isArray(prediction.output) && prediction.output.length > 0) {
          resultUrl = String(prediction.output[0]);
        }
      }

      return Response.json({
        success: true,
        data: {
          id: predictionId,
          status,
          resultUrl,
          error: prediction.error || null,
        },
      });
    }

    return errorResponse('UNKNOWN_PROVIDER', 'Unknown provider.', 400);
  } catch (error) {
    console.error('Status check error:', error);
    return errorResponse('UNKNOWN', 'Could not check generation status.', 500);
  }
}
