import { NextRequest } from 'next/server';
import Replicate from 'replicate';
import { VIDEO_MODELS, getVideoModel, formatCost } from '@/lib/creative/model-registry';

export const maxDuration = 300;

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

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

async function generateWithRunway(
  imageUrl: string,
  prompt: string,
  duration: number
): Promise<{ id: string; provider: string } | null> {
  const apiKey = process.env.RUNWAYML_API_SECRET;
  if (!apiKey) return null;

  try {
    // Runway Gen-3 Alpha Turbo — image-to-video
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
      console.error('Runway error:', response.status, await response.text());
      return null;
    }

    const data = await response.json();
    return { id: data.id, provider: 'runway' };
  } catch (e) {
    console.error('Runway failed:', e);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      prompt,
      duration,
      aspectRatio,
      imageUrl: providedImageUrl,
      referenceImageUrl,
      model: requestedModel,
      platform,
    } = await req.json();

    if (!prompt) {
      return errorResponse('MISSING_PROMPT', 'No prompt provided.', 400);
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return errorResponse('NOT_CONFIGURED', 'Video generation not configured.', 503);
    }

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
    const ar = aspectRatio || '16:9';
    const dur = duration || 5;

    // STEP 1: Get or generate a reference still frame
    // This is critical — it ensures the jewelry design is correct in the video
    let firstFrameUrl = providedImageUrl || referenceImageUrl || null;

    if (!firstFrameUrl) {
      // Generate a still frame first with Nano Banana Pro
      firstFrameUrl = await generateStillFrame(replicate, prompt, ar);
    }

    // STEP 2: Route to the right video model
    // Runway prompts → actual Runway Gen-3 (image-to-video, preserves design)
    // Kling prompts → Veo 3 or Veo 2 (text-to-video with image guidance)

    if ((platform === 'runway' || requestedModel === 'runway') && firstFrameUrl) {
      // Use ACTUAL Runway Gen-3 API — image-to-video preserves the jewelry design
      const result = await generateWithRunway(firstFrameUrl, prompt, dur);
      if (result) {
        return Response.json({
          success: true,
          data: {
            id: result.id,
            provider: 'runway',
            model: 'Runway Gen-3 Alpha Turbo',
            status: 'processing',
            cost: formatCost(0.25), // ~$0.05/sec, 5sec
            costRaw: 0.25,
            estimatedTime: 30,
            resolution: '720p',
            quality: 9,
            firstFrameUrl,
            note: 'Using actual Runway API with image-to-video for design accuracy',
          },
        });
      }
    }

    // For Kling/other video: use Veo 3 (with image input if available)
    const selectedModel = requestedModel ? getVideoModel(requestedModel) : null;
    const chain = selectedModel
      ? [selectedModel, ...VIDEO_MODELS.filter(m => m.id !== selectedModel.id)]
      : VIDEO_MODELS;

    for (const modelInfo of chain) {
      try {
        let input: Record<string, unknown>;

        if (modelInfo.id === 'veo-3') {
          input = {
            prompt,
            duration: dur,
            aspect_ratio: ar,
            resolution: '1080p',
            generate_audio: true,
            ...(firstFrameUrl && { image: firstFrameUrl }),
          };
        } else if (modelInfo.id === 'veo-2') {
          input = {
            prompt,
            duration: Math.min(dur, 8),
            aspect_ratio: ar,
            ...(firstFrameUrl && { image: firstFrameUrl }),
          };
        } else {
          // Minimax — image-to-video
          input = {
            prompt,
            prompt_optimizer: true,
            ...(firstFrameUrl && { first_frame_image: firstFrameUrl }),
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
            cost: formatCost(modelInfo.costEstimate + (firstFrameUrl && !providedImageUrl ? 0.13 : 0)),
            costRaw: modelInfo.costEstimate,
            estimatedTime: modelInfo.avgTimeSeconds,
            resolution: modelInfo.resolution,
            quality: modelInfo.quality,
            firstFrameUrl,
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
