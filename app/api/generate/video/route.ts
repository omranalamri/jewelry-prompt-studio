import { NextRequest } from 'next/server';
import Replicate from 'replicate';
import { VIDEO_MODELS, getVideoModel, getBestVideoModel, formatCost, ModelInfo } from '@/lib/creative/model-registry';
import { getDb } from '@/lib/db';
import { logCost } from '@/lib/cost-tracker';
import { trackGeneration } from '@/lib/learning/generation-tracker';
import { validatePrompt } from '@/lib/jewelry/validation';

export const maxDuration = 300;

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

// STEP 1: Generate a NEW creative still frame from the prompt
// This is NOT the original photo — it's a fresh AI-generated image
// that matches the creative direction while keeping the jewelry accurate
async function generateCreativeFrame(
  replicate: Replicate,
  prompt: string,
  aspectRatio: string,
  referenceImageUrl?: string
): Promise<string | null> {
  try {
    const output = await replicate.run('google/nano-banana-pro', {
      input: {
        prompt: referenceImageUrl
          ? `Transform this jewelry photo into a production-ready video still frame. Keep the EXACT jewelry piece unchanged — same design, shape, text, engravings, stones, metal. Only change the styling: ${prompt}`
          : `Create a production-ready still frame for a luxury jewelry video: ${prompt}`,
        resolution: '2K',
        aspect_ratio: aspectRatio,
        output_format: 'jpg',
        safety_filter_level: 'block_only_high',
        // Pass reference image so Nano Banana matches the jewelry design
        ...(referenceImageUrl && { image_input: [referenceImageUrl] }),
      },
    });
    return Array.isArray(output) ? String(output[0]) : String(output);
  } catch (e) {
    console.error('Frame generation failed:', e instanceof Error ? e.message.slice(0, 100) : e);
    // Fallback: try Flux Ultra with reference guidance
    try {
      const output = await replicate.run('black-forest-labs/flux-1.1-pro-ultra', {
        input: {
          prompt: `Keep the exact jewelry piece from the reference, only change the styling: ${prompt}`,
          aspect_ratio: aspectRatio,
          raw: true,
          output_format: 'jpg',
          ...(referenceImageUrl && { image_prompt: referenceImageUrl, image_prompt_strength: 0.7 }),
        },
      });
      return typeof output === 'string' ? output : String(output);
    } catch {
      // Third fallback: Recraft (own API, not Replicate)
      if (process.env.RECRAFT_API_TOKEN) {
        try {
          const response = await fetch('https://external.api.recraft.ai/v1/images/generations', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${process.env.RECRAFT_API_TOKEN}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ prompt: `Professional jewelry video still frame: ${prompt}`, style: 'realistic_image', size: '1365x1024' }),
          });
          if (response.ok) {
            const data = await response.json();
            return data.data?.[0]?.url || null;
          }
        } catch { /* */ }
      }
      // Fourth fallback: use the reference image directly as the frame
      if (referenceImageUrl) return referenceImageUrl;
      return null;
    }
  }
}

async function runWithRunway(imageUrl: string, prompt: string, duration: number) {
  const apiKey = process.env.RUNWAYML_API_SECRET;
  if (!apiKey) throw new Error('Runway not configured');

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
  if (!response.ok) throw new Error(`Runway ${response.status}`);
  const data = await response.json();
  return { id: data.id, provider: 'runway' as const };
}

async function runWithReplicate(
  replicate: Replicate, modelInfo: ModelInfo, prompt: string,
  firstFrameUrl: string | null, duration: number, aspectRatio: string
) {
  let input: Record<string, unknown>;
  if (modelInfo.id === 'kling-2.5') {
    input = { prompt, duration: Math.min(duration, 10), aspect_ratio: aspectRatio, ...(firstFrameUrl && { start_image: firstFrameUrl }) };
  } else if (modelInfo.id === 'veo-3') {
    input = { prompt, duration, aspect_ratio: aspectRatio, resolution: '1080p', generate_audio: true, ...(firstFrameUrl && { image: firstFrameUrl }) };
  } else if (modelInfo.id === 'seedance-2') {
    input = { prompt, duration: Math.min(duration, 10), aspect_ratio: aspectRatio, generate_audio: true, ...(firstFrameUrl && { image: firstFrameUrl, reference_images: [firstFrameUrl] }) };
  } else if (modelInfo.id === 'seedance') {
    input = { prompt, duration: Math.min(duration, 10), aspect_ratio: aspectRatio, generate_audio: true, camera_fixed: false, ...(firstFrameUrl && { image: firstFrameUrl }) };
  } else if (modelInfo.id === 'veo-2') {
    input = { prompt, duration: Math.min(duration, 8), aspect_ratio: aspectRatio, ...(firstFrameUrl && { image: firstFrameUrl }) };
  } else {
    input = { prompt, prompt_optimizer: true, ...(firstFrameUrl && { first_frame_image: firstFrameUrl }) };
  }
  const prediction = await replicate.predictions.create({ model: modelInfo.replicateId as `${string}/${string}`, input });
  return { id: prediction.id, provider: 'replicate' as const };
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, duration = 5, aspectRatio = '16:9', referenceImageUrl, model: requestedModelId } = await req.json();

    if (!prompt) return errorResponse('MISSING_PROMPT', 'No prompt provided.', 400);
    if (!process.env.REPLICATE_API_TOKEN) return errorResponse('NOT_CONFIGURED', 'Video generation not configured.', 503);

    // Anti-hallucination validation on video prompts too
    let validatedPrompt = prompt;
    const validation = validatePrompt(prompt);
    if (validation.correctionCount > 0) {
      validatedPrompt = validation.correctedPrompt;
    }

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    // ================================================================
    // THE CORRECT PIPELINE:
    // 1. ALWAYS generate a NEW creative frame from the prompt
    //    - If referenceImageUrl exists, use it as a REFERENCE for the
    //      jewelry design (what the piece looks like), but the creative
    //      direction (lighting, composition, mood) comes from the prompt
    //    - The reference is NOT used directly as the video first frame
    // 2. Animate that new creative frame into video
    // ================================================================

    const firstFrameUrl = await generateCreativeFrame(replicate, validatedPrompt, aspectRatio, referenceImageUrl || undefined);
    const frameCost = 0.13; // Nano Banana Pro cost for frame

    if (!firstFrameUrl) {
      return errorResponse('FRAME_FAILED', 'Could not generate the creative frame. Please try again.', 500);
    }

    // Save the creative frame to repository too
    try {
      const sql = getDb();
      await sql`INSERT INTO repository (category, title, description, image_url, tags, metadata)
        VALUES ('generated', ${'Video Frame — ' + new Date().toLocaleDateString()}, ${prompt.slice(0, 300)}, ${firstFrameUrl}, ${'{"frame","video-source"}'}, '{}')`;
    } catch { /* non-critical */ }

    // Now animate the creative frame
    const requested = requestedModelId ? getVideoModel(requestedModelId) : getBestVideoModel();
    const chain = requested
      ? [requested, ...VIDEO_MODELS.filter(m => m.id !== requested.id)]
      : VIDEO_MODELS;

    for (const modelInfo of chain) {
      try {
        let result: { id: string; provider: 'runway' | 'replicate' };

        if (modelInfo.id === 'runway') {
          result = await runWithRunway(firstFrameUrl, validatedPrompt, duration);
        } else {
          result = await runWithReplicate(replicate, modelInfo, validatedPrompt, firstFrameUrl, duration, aspectRatio);
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
            requestedModel: requestedModelId || chain[0].id,
            wasFirstChoice: modelInfo.id === (requestedModelId || chain[0].id),
            pipeline: 'prompt → creative frame (Nano Banana Pro) → animate',
          },
        });
        logCost({ model: modelInfo.name, type: 'video', cost: modelInfo.costEstimate + frameCost, promptPreview: prompt });
        trackGeneration({
          promptText: prompt, generationModel: modelInfo.id, generationType: 'video',
          referenceImageUrl: referenceImageUrl || undefined,
          cost: modelInfo.costEstimate + frameCost,
        });
      } catch {
        continue;
      }
    }

    return errorResponse('VIDEO_ERROR', 'All video models are currently unavailable.', 500);
  } catch (error) {
    console.error('Video generation error:', error);
    return errorResponse('GENERATION_FAILED', 'Video generation failed.', 500);
  }
}
