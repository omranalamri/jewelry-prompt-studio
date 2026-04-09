import { NextRequest } from 'next/server';
import Replicate from 'replicate';

export const maxDuration = 300;

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, duration, aspectRatio, imageUrl, negativePrompt } = await req.json();

    if (!prompt) {
      return errorResponse('MISSING_PROMPT', 'No prompt provided.', 400);
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return errorResponse('NOT_CONFIGURED', 'Video generation not configured.', 503);
    }

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    if (imageUrl) {
      // Image-to-video: Veo 3 (supports image input) → fallback Minimax
      try {
        const prediction = await replicate.predictions.create({
          model: 'google/veo-3',
          input: {
            prompt,
            image: imageUrl,
            duration: duration || 8,
            aspect_ratio: aspectRatio || '16:9',
            resolution: '1080p',
            generate_audio: true,
            ...(negativePrompt && { negative_prompt: negativePrompt }),
          },
        });
        return Response.json({
          success: true,
          data: { id: prediction.id, provider: 'replicate', model: 'google/veo-3', status: 'processing' },
        });
      } catch {
        // Fallback to Minimax for image-to-video
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
          data: { id: prediction.id, provider: 'replicate', model: 'minimax/video-01', status: 'processing' },
        });
      }
    }

    // Text-to-video: Google Veo 3 (flagship, with audio!) → fallback Veo 2 → Minimax
    const models = [
      {
        model: 'google/veo-3' as const,
        input: {
          prompt,
          duration: duration || 8,
          aspect_ratio: aspectRatio || '16:9',
          resolution: '1080p',
          generate_audio: true,
          ...(negativePrompt && { negative_prompt: negativePrompt }),
        },
      },
      {
        model: 'google/veo-2' as const,
        input: {
          prompt,
          duration: duration || 5,
          aspect_ratio: aspectRatio || '16:9',
        },
      },
      {
        model: 'minimax/video-01' as const,
        input: {
          prompt,
          prompt_optimizer: true,
        },
      },
    ];

    for (const config of models) {
      try {
        const prediction = await replicate.predictions.create({
          model: config.model,
          input: config.input,
        });
        return Response.json({
          success: true,
          data: { id: prediction.id, provider: 'replicate', model: config.model, status: 'processing' },
        });
      } catch (e) {
        console.error(`${config.model} failed:`, e instanceof Error ? e.message.slice(0, 100) : e);
        continue;
      }
    }

    return errorResponse('VIDEO_ERROR', 'Video generation failed on all providers.', 500);
  } catch (error) {
    console.error('Video generation error:', error);
    return errorResponse('GENERATION_FAILED', 'Video generation failed. Please try again.', 500);
  }
}
