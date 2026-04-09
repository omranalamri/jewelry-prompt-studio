import { NextRequest } from 'next/server';
import Replicate from 'replicate';
import { getVideoModel, getBestVideoModel, formatCost } from '@/lib/creative/model-registry';

export const maxDuration = 300;

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

// Step 1: Generate a still frame so the video preserves the jewelry design
async function generateStillFrame(
  replicate: Replicate,
  prompt: string,
  aspectRatio: string
): Promise<string | null> {
  try {
    const output = await replicate.run('google/nano-banana-pro', {
      input: {
        prompt: `High quality still frame for video: ${prompt}`,
        resolution: '2K',
        aspect_ratio: aspectRatio,
        output_format: 'jpg',
        safety_filter_level: 'block_only_high',
      },
    });
    return Array.isArray(output) ? String(output[0]) : String(output);
  } catch {
    return null;
  }
}

// Runway Gen-3 Alpha — actual API
async function runWithRunway(imageUrl: string, prompt: string, duration: number) {
  const apiKey = process.env.RUNWAYML_API_SECRET;
  if (!apiKey) throw new Error('RUNWAYML_API_SECRET not configured');

  const response = await fetch('https://api.dev.runwayml.com/v1/image_to_video', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'X-Runway-Version': '2024-11-06',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gen3a_turbo',
      promptImage: imageUrl,
      promptText: prompt.slice(0, 512),
      duration: duration <= 5 ? 5 : 10,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Runway API error ${response.status}: ${err}`);
  }

  const data = await response.json();
  return { id: data.id, provider: 'runway' as const };
}

// Replicate models (Veo 3, Veo 2, Minimax)
async function runWithReplicate(
  replicate: Replicate,
  modelId: string,
  replicateId: string,
  prompt: string,
  firstFrameUrl: string | null,
  duration: number,
  aspectRatio: string
) {
  let input: Record<string, unknown>;

  if (modelId === 'veo-3') {
    input = {
      prompt,
      duration,
      aspect_ratio: aspectRatio,
      resolution: '1080p',
      generate_audio: true,
      ...(firstFrameUrl && { image: firstFrameUrl }),
    };
  } else if (modelId === 'veo-2') {
    input = {
      prompt,
      duration: Math.min(duration, 8),
      aspect_ratio: aspectRatio,
      ...(firstFrameUrl && { image: firstFrameUrl }),
    };
  } else {
    // Minimax
    input = {
      prompt,
      prompt_optimizer: true,
      ...(firstFrameUrl && { first_frame_image: firstFrameUrl }),
    };
  }

  const prediction = await replicate.predictions.create({
    model: replicateId as `${string}/${string}`,
    input,
  });

  return { id: prediction.id, provider: 'replicate' as const };
}

export async function POST(req: NextRequest) {
  try {
    const {
      prompt,
      duration = 5,
      aspectRatio = '16:9',
      referenceImageUrl,
      model: requestedModelId,
    } = await req.json();

    if (!prompt) {
      return errorResponse('MISSING_PROMPT', 'No prompt provided.', 400);
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return errorResponse('NOT_CONFIGURED', 'Video generation not configured.', 503);
    }

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    // Determine which model to use — user's choice is FINAL, no silent switching
    const modelInfo = requestedModelId
      ? getVideoModel(requestedModelId)
      : getBestVideoModel();

    if (!modelInfo) {
      return errorResponse('INVALID_MODEL', `Unknown model: ${requestedModelId}`, 400);
    }

    // Get or generate a reference still frame for design accuracy
    let firstFrameUrl = referenceImageUrl || null;
    const needsFrame = modelInfo.id === 'runway' || !firstFrameUrl;

    if (needsFrame && !firstFrameUrl) {
      firstFrameUrl = await generateStillFrame(replicate, prompt, aspectRatio);
    }

    const frameCost = (!referenceImageUrl && firstFrameUrl) ? 0.13 : 0;

    try {
      let result: { id: string; provider: 'runway' | 'replicate' };

      if (modelInfo.id === 'runway') {
        // ACTUAL Runway Gen-3 API
        if (!firstFrameUrl) {
          return errorResponse('MISSING_FRAME', 'Could not generate still frame for Runway. Try uploading a reference image.', 500);
        }
        result = await runWithRunway(firstFrameUrl, prompt, duration);
      } else {
        // Replicate (Veo 3, Veo 2, Minimax)
        result = await runWithReplicate(
          replicate, modelInfo.id, modelInfo.replicateId,
          prompt, firstFrameUrl, duration, aspectRatio
        );
      }

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
        },
      });
    } catch (e) {
      console.error(`${modelInfo.name} failed:`, e instanceof Error ? e.message : e);
      return errorResponse('VIDEO_ERROR', `${modelInfo.name} failed: ${e instanceof Error ? e.message.slice(0, 100) : 'Unknown error'}`, 500);
    }
  } catch (error) {
    console.error('Video generation error:', error);
    return errorResponse('GENERATION_FAILED', 'Video generation failed.', 500);
  }
}
