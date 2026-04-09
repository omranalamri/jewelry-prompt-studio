import { NextRequest } from 'next/server';
import Replicate from 'replicate';

export const maxDuration = 300;

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, duration, aspectRatio, imageUrl } = await req.json();

    if (!prompt) {
      return errorResponse('MISSING_PROMPT', 'No prompt provided.', 400);
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return errorResponse('NOT_CONFIGURED', 'Video generation not configured (missing REPLICATE_API_TOKEN).', 503);
    }

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    // Strategy: use Minimax Video-01 for image-to-video, Veo 2 for text-to-video
    if (imageUrl) {
      // Image-to-video with Minimax Video-01
      try {
        const prediction = await replicate.predictions.create({
          model: 'minimax/video-01',
          input: {
            prompt,
            first_frame_image: imageUrl,
            prompt_optimizer: true,
          },
        });

        return Response.json({
          success: true,
          data: {
            id: prediction.id,
            provider: 'replicate',
            model: 'minimax/video-01',
            status: 'processing',
          },
        });
      } catch (e) {
        console.error('Minimax error:', e);
        return errorResponse('VIDEO_ERROR', 'Image-to-video generation failed.', 500);
      }
    }

    // Text-to-video: try Google Veo 2 first, fall back to Minimax
    try {
      const prediction = await replicate.predictions.create({
        model: 'google/veo-2',
        input: {
          prompt,
          duration: duration || 5,
          aspect_ratio: aspectRatio || '16:9',
        },
      });

      return Response.json({
        success: true,
        data: {
          id: prediction.id,
          provider: 'replicate',
          model: 'google/veo-2',
          status: 'processing',
        },
      });
    } catch {
      // Fallback to Minimax text-to-video
      try {
        const prediction = await replicate.predictions.create({
          model: 'minimax/video-01',
          input: {
            prompt,
            prompt_optimizer: true,
          },
        });

        return Response.json({
          success: true,
          data: {
            id: prediction.id,
            provider: 'replicate',
            model: 'minimax/video-01',
            status: 'processing',
          },
        });
      } catch (e2) {
        console.error('Video fallback error:', e2);
        return errorResponse('VIDEO_ERROR', 'Video generation failed on all providers.', 500);
      }
    }
  } catch (error) {
    console.error('Video generation error:', error);
    return errorResponse('GENERATION_FAILED', 'Video generation failed. Please try again.', 500);
  }
}
