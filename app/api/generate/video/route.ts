import { NextRequest } from 'next/server';
import Replicate from 'replicate';
import { VIDEO_MODELS, getVideoModel, getBestVideoModel, formatCost } from '@/lib/creative/model-registry';

export const maxDuration = 300;

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, duration, aspectRatio, imageUrl, negativePrompt, model: requestedModel } = await req.json();

    if (!prompt) {
      return errorResponse('MISSING_PROMPT', 'No prompt provided.', 400);
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return errorResponse('NOT_CONFIGURED', 'Video generation not configured.', 503);
    }

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    // Build model chain: requested → best → fallbacks
    const selectedModel = requestedModel ? getVideoModel(requestedModel) : null;
    const best = getBestVideoModel();
    const chain = selectedModel
      ? [selectedModel, ...VIDEO_MODELS.filter(m => m.id !== selectedModel.id)]
      : [best, ...VIDEO_MODELS.filter(m => m.id !== best.id)];

    for (const modelInfo of chain) {
      try {
        let input: Record<string, unknown>;

        if (modelInfo.id === 'veo-3') {
          input = {
            prompt,
            duration: duration || 8,
            aspect_ratio: aspectRatio || '16:9',
            resolution: '1080p',
            generate_audio: true,
            ...(imageUrl && { image: imageUrl }),
            ...(negativePrompt && { negative_prompt: negativePrompt }),
          };
        } else if (modelInfo.id === 'veo-2') {
          input = {
            prompt,
            duration: duration || 5,
            aspect_ratio: aspectRatio || '16:9',
            ...(imageUrl && { image: imageUrl }),
          };
        } else {
          // Minimax
          input = {
            prompt,
            prompt_optimizer: true,
            ...(imageUrl && { first_frame_image: imageUrl }),
          };
        }

        const prediction = await replicate.predictions.create({
          model: modelInfo.replicateId as `${string}/${string}`,
          input,
        });

        return Response.json({
          success: true,
          data: {
            id: prediction.id,
            provider: modelInfo.id,
            model: modelInfo.name,
            status: 'processing',
            cost: formatCost(modelInfo.costEstimate),
            costRaw: modelInfo.costEstimate,
            estimatedTime: modelInfo.avgTimeSeconds,
            resolution: modelInfo.resolution,
            quality: modelInfo.quality,
          },
        });
      } catch (e) {
        console.error(`${modelInfo.id} failed:`, e instanceof Error ? e.message.slice(0, 100) : e);
        continue;
      }
    }

    return errorResponse('VIDEO_ERROR', 'All video models failed.', 500);
  } catch (error) {
    console.error('Video generation error:', error);
    return errorResponse('GENERATION_FAILED', 'Video generation failed.', 500);
  }
}
