import { NextRequest } from 'next/server';
import Replicate from 'replicate';
import { VIDEO_MODELS, getVideoModel, getBestVideoModel, formatCost, ModelInfo } from '@/lib/creative/model-registry';

export const maxDuration = 300;

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

async function generateStillFrame(replicate: Replicate, prompt: string, ar: string): Promise<string | null> {
  try {
    const output = await replicate.run('google/nano-banana-pro', {
      input: {
        prompt: `High quality still frame for video: ${prompt}`,
        resolution: '2K', aspect_ratio: ar, output_format: 'jpg', safety_filter_level: 'block_only_high',
      },
    });
    return Array.isArray(output) ? String(output[0]) : String(output);
  } catch { return null; }
}

async function runVideoModel(
  replicate: Replicate,
  modelInfo: ModelInfo,
  prompt: string,
  firstFrameUrl: string | null,
  duration: number,
  aspectRatio: string
): Promise<{ id: string; provider: string }> {
  if (modelInfo.id === 'runway') {
    const apiKey = process.env.RUNWAYML_API_SECRET;
    if (!apiKey) throw new Error('Runway not configured');
    if (!firstFrameUrl) throw new Error('Runway needs a reference frame');

    const response = await fetch('https://api.dev.runwayml.com/v1/image_to_video', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-Runway-Version': '2024-11-06',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gen3a_turbo',
        promptImage: firstFrameUrl,
        promptText: prompt.slice(0, 512),
        duration: duration <= 5 ? 5 : 10,
      }),
    });
    if (!response.ok) throw new Error(`Runway ${response.status}`);
    const data = await response.json();
    return { id: data.id, provider: 'runway' };
  }

  // Replicate models
  let input: Record<string, unknown>;
  if (modelInfo.id === 'veo-3') {
    input = { prompt, duration, aspect_ratio: aspectRatio, resolution: '1080p', generate_audio: true, ...(firstFrameUrl && { image: firstFrameUrl }) };
  } else if (modelInfo.id === 'veo-2') {
    input = { prompt, duration: Math.min(duration, 8), aspect_ratio: aspectRatio, ...(firstFrameUrl && { image: firstFrameUrl }) };
  } else {
    input = { prompt, prompt_optimizer: true, ...(firstFrameUrl && { first_frame_image: firstFrameUrl }) };
  }

  const prediction = await replicate.predictions.create({
    model: modelInfo.replicateId as `${string}/${string}`,
    input,
  });
  return { id: prediction.id, provider: 'replicate' };
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, duration = 5, aspectRatio = '16:9', referenceImageUrl, model: requestedModelId } = await req.json();

    if (!prompt) return errorResponse('MISSING_PROMPT', 'No prompt provided.', 400);
    if (!process.env.REPLICATE_API_TOKEN) return errorResponse('NOT_CONFIGURED', 'Video generation not configured.', 503);

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    // Get or generate a reference still frame
    let firstFrameUrl = referenceImageUrl || null;
    if (!firstFrameUrl) {
      firstFrameUrl = await generateStillFrame(replicate, prompt, aspectRatio);
    }
    const frameCost = (!referenceImageUrl && firstFrameUrl) ? 0.13 : 0;

    // Build chain: requested model first, then remaining by quality
    const requested = requestedModelId ? getVideoModel(requestedModelId) : getBestVideoModel();
    const chain = requested
      ? [requested, ...VIDEO_MODELS.filter(m => m.id !== requested.id)]
      : VIDEO_MODELS;

    // Try each model — smooth fallback, report which one delivered
    for (const modelInfo of chain) {
      try {
        const result = await runVideoModel(replicate, modelInfo, prompt, firstFrameUrl, duration, aspectRatio);

        return Response.json({
          success: true,
          data: {
            id: result.id,
            provider: result.provider,
            model: modelInfo.name,
            modelId: modelInfo.id,
            status: 'processing',
            cost: formatCost(modelInfo.costEstimate + frameCost),
            costRaw: modelInfo.costEstimate + frameCost,
            estimatedTime: modelInfo.avgTimeSeconds,
            resolution: modelInfo.resolution,
            quality: modelInfo.quality,
            firstFrameUrl,
            requestedModel: requestedModelId || chain[0].id,
            wasFirstChoice: modelInfo.id === (requestedModelId || chain[0].id),
          },
        });
      } catch {
        continue; // silently try next
      }
    }

    return errorResponse('VIDEO_ERROR', 'All video models are currently unavailable. Please try again.', 500);
  } catch (error) {
    console.error('Video generation error:', error);
    return errorResponse('GENERATION_FAILED', 'Video generation failed.', 500);
  }
}
