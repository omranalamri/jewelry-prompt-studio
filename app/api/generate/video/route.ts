import { NextRequest } from 'next/server';
import Replicate from 'replicate';
import { VIDEO_MODELS, getVideoModel, getBestVideoModel, formatCost } from '@/lib/creative/model-registry';
import { getDb } from '@/lib/db';
import { logCost } from '@/lib/cost-tracker';
import { trackGeneration } from '@/lib/learning/generation-tracker';
import { validatePromptWithLearned as validatePrompt } from '@/lib/jewelry/validation';
import { rehostForReplicate } from '@/lib/rehost-image';

export const maxDuration = 300;

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

// Generate a creative frame using Nano Banana 2
async function generateFrame(replicate: Replicate, prompt: string, ar: string, refUrl?: string): Promise<string | null> {
  try {
    const rehostedRef = refUrl ? await rehostForReplicate(refUrl) : undefined;
    const output = await replicate.run('google/nano-banana-2', {
      input: {
        prompt: rehostedRef
          ? `Transform this jewelry photo into a video still frame. STRICTLY keep exact design. ${prompt}`
          : `Create a production-ready video still frame: ${prompt}`,
        resolution: '1K', aspect_ratio: ar, output_format: 'jpg',
        ...(rehostedRef && { image_input: [rehostedRef] }),
      },
    });
    return Array.isArray(output) ? String(output[0]) : String(output);
  } catch {
    // If NB2 fails, use the reference directly as the frame
    return refUrl || null;
  }
}

async function runWithRunway(imageUrl: string, prompt: string, duration: number) {
  const apiKey = process.env.RUNWAYML_API_SECRET;
  if (!apiKey) throw new Error('Runway not configured');
  const resp = await fetch('https://api.dev.runwayml.com/v1/image_to_video', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'X-Runway-Version': '2024-11-06', 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gen3a_turbo', promptImage: imageUrl, promptText: prompt.slice(0, 512), duration: duration <= 5 ? 5 : 10 }),
  });
  if (!resp.ok) throw new Error(`Runway ${resp.status}`);
  return { id: (await resp.json()).id, provider: 'runway' as const };
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, duration = 5, aspectRatio = '16:9', referenceImageUrl, model: requestedModelId } = await req.json();
    if (!prompt) return errorResponse('MISSING_PROMPT', 'No prompt.', 400);
    if (!process.env.REPLICATE_API_TOKEN) return errorResponse('NOT_CONFIGURED', 'Not configured.', 503);

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    // Validate prompt
    let validatedPrompt = prompt;
    const validation = validatePrompt(prompt);
    if (validation.correctionCount > 0) validatedPrompt = validation.correctedPrompt;

    // Generate creative frame with NB2
    const frameUrl = await generateFrame(replicate, validatedPrompt, aspectRatio, referenceImageUrl);
    const frameCost = frameUrl && frameUrl !== referenceImageUrl ? 0.05 : 0;

    if (!frameUrl) return errorResponse('FRAME_FAILED', 'Could not generate frame. Try again in a few minutes.', 503);

    // Select video model
    const modelInfo = requestedModelId ? (getVideoModel(requestedModelId) || getBestVideoModel()) : getBestVideoModel();

    try {
      let result: { id: string; provider: 'runway' | 'replicate' };

      if (modelInfo.id === 'runway') {
        result = await runWithRunway(frameUrl, validatedPrompt, duration);
      } else {
        let input: Record<string, unknown>;
        if (modelInfo.id === 'kling-2.5') {
          input = { prompt: validatedPrompt, duration: Math.min(duration, 10), aspect_ratio: aspectRatio, ...(frameUrl && { start_image: frameUrl }) };
        } else if (modelInfo.id === 'seedance-2') {
          const rehostedRef = referenceImageUrl ? await rehostForReplicate(referenceImageUrl) : undefined;
          const refs = [frameUrl, rehostedRef].filter(Boolean) as string[];
          input = { prompt: validatedPrompt, duration: Math.min(duration, 10), aspect_ratio: aspectRatio, generate_audio: true, ...(frameUrl && { image: frameUrl }), ...(refs.length > 0 && { reference_images: refs.slice(0, 4) }) };
        } else {
          input = { prompt: validatedPrompt, ...(frameUrl && { image: frameUrl }) };
        }

        const prediction = await replicate.predictions.create({ model: modelInfo.replicateId as `${string}/${string}`, input });
        result = { id: prediction.id, provider: 'replicate' };
      }

      logCost({ model: modelInfo.name, type: 'video', cost: modelInfo.costEstimate + frameCost, promptPreview: validatedPrompt });
      trackGeneration({ promptText: validatedPrompt, generationModel: modelInfo.id, generationType: 'video', referenceImageUrl, cost: modelInfo.costEstimate + frameCost });

      // Save frame
      try {
        const sql = getDb();
        await sql`INSERT INTO repository (category, title, image_url, tags, prompt_text, model_used, reference_url)
          VALUES ('generated', ${'Video Frame — ' + new Date().toLocaleDateString()}, ${frameUrl}, ${['frame', 'video-source']}, ${validatedPrompt.slice(0, 200)}, 'Nano Banana 2', ${referenceImageUrl || null})`;
      } catch { /* */ }

      return Response.json({
        success: true,
        data: {
          id: result.id, provider: result.provider, model: modelInfo.name, modelId: modelInfo.id,
          status: 'processing', cost: formatCost(modelInfo.costEstimate + frameCost),
          costRaw: modelInfo.costEstimate + frameCost, estimatedTime: modelInfo.avgTimeSeconds,
          resolution: modelInfo.resolution, quality: modelInfo.quality, firstFrameUrl: frameUrl,
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown';
      if (msg.includes('unavailable') || msg.includes('E003')) {
        return errorResponse('MODEL_BUSY', `${modelInfo.name} is at capacity. Try again shortly.`, 503);
      }
      return errorResponse('VIDEO_ERROR', `${modelInfo.name}: ${msg.slice(0, 80)}`, 500);
    }
  } catch (error) {
    console.error('Video error:', error);
    return errorResponse('GENERATION_FAILED', 'Video generation failed.', 500);
  }
}
