import { NextRequest } from 'next/server';
import Replicate from 'replicate';
import { getImageModel, getBestImageModel, formatCost, ModelInfo } from '@/lib/creative/model-registry';

export const maxDuration = 120;

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

async function runModel(
  replicate: Replicate,
  modelInfo: ModelInfo,
  cleanPrompt: string,
  ar: string,
  referenceImageUrl?: string
): Promise<{ resultUrl: string; elapsed: number }> {
  const startTime = Date.now();

  if (modelInfo.id === 'recraft-v3') {
    if (!process.env.RECRAFT_API_TOKEN) throw new Error('RECRAFT_API_TOKEN not configured');
    const response = await fetch('https://external.api.recraft.ai/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RECRAFT_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: cleanPrompt,
        style: 'realistic_image',
        size: ar === '9:16' ? '1024x1820' : ar === '1:1' ? '1024x1024' : '1365x1024',
      }),
    });
    if (!response.ok) throw new Error(`Recraft error ${response.status}`);
    const data = await response.json();
    const imageUrl = data.data?.[0]?.url;
    if (!imageUrl) throw new Error('No image from Recraft');
    return { resultUrl: imageUrl, elapsed: (Date.now() - startTime) / 1000 };
  }

  if (modelInfo.id === 'flux-ultra') {
    const output = await replicate.run('black-forest-labs/flux-1.1-pro-ultra', {
      input: {
        prompt: cleanPrompt,
        aspect_ratio: ar,
        raw: true,
        output_format: 'jpg',
        ...(referenceImageUrl && {
          image_prompt: referenceImageUrl,
          image_prompt_strength: 0.35,
        }),
      },
    });
    const resultUrl = typeof output === 'string' ? output : String(output);
    return { resultUrl, elapsed: (Date.now() - startTime) / 1000 };
  }

  if (modelInfo.id === 'ideogram-v2') {
    const output = await replicate.run('ideogram-ai/ideogram-v2', {
      input: { prompt: cleanPrompt, aspect_ratio: ar },
    });
    const resultUrl = Array.isArray(output) ? String(output[0]) : String(output);
    return { resultUrl, elapsed: (Date.now() - startTime) / 1000 };
  }

  // Nano Banana 2 and Pro
  const output = await replicate.run(modelInfo.replicateId as `${string}/${string}`, {
    input: {
      prompt: referenceImageUrl
        ? `Recreate the exact pose, composition, camera angle, and lighting from the reference image, but with: ${cleanPrompt}`
        : cleanPrompt,
      resolution: modelInfo.id === 'nano-banana-pro' ? '2K' : '1K',
      aspect_ratio: ar,
      output_format: 'jpg',
      ...(modelInfo.id === 'nano-banana-pro' && { safety_filter_level: 'block_only_high' }),
      ...(referenceImageUrl && { image_input: [referenceImageUrl] }),
    },
  });
  const resultUrl = Array.isArray(output) ? String(output[0]) : String(output);
  return { resultUrl, elapsed: (Date.now() - startTime) / 1000 };
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, platform, aspectRatio, model: requestedModelId, referenceImageUrl } = await req.json();

    if (!prompt) {
      return errorResponse('MISSING_PROMPT', 'No prompt provided.', 400);
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return errorResponse('NOT_CONFIGURED', 'Image generation not configured.', 503);
    }

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    const cleanPrompt = prompt
      .replace(/--ar\s+\S+/g, '')
      .replace(/--style\s+\S+/g, '')
      .replace(/--v\s+\S+/g, '')
      .replace(/--q\s+\S+/g, '')
      .replace(/--no\s+.*/g, '')
      .trim();

    const arMatch = prompt.match(/--ar\s+(\d+:\d+)/);
    const ar = arMatch ? arMatch[1] : (aspectRatio || '1:1');

    // User's choice is FINAL — no silent switching
    const modelInfo = requestedModelId
      ? getImageModel(requestedModelId)
      : getBestImageModel();

    if (!modelInfo) {
      return errorResponse('INVALID_MODEL', `Unknown model: ${requestedModelId}`, 400);
    }

    try {
      const { resultUrl, elapsed } = await runModel(
        replicate, modelInfo, cleanPrompt, ar, referenceImageUrl
      );

      return Response.json({
        success: true,
        data: {
          id: crypto.randomUUID(),
          provider: modelInfo.id,
          model: modelInfo.name,
          modelId: modelInfo.id,
          status: 'completed',
          resultUrl,
          cost: formatCost(modelInfo.costEstimate),
          costRaw: modelInfo.costEstimate,
          timeSeconds: parseFloat(elapsed.toFixed(1)),
          resolution: modelInfo.resolution,
          quality: modelInfo.quality,
        },
      });
    } catch (e) {
      console.error(`${modelInfo.name} failed:`, e instanceof Error ? e.message : e);
      return errorResponse(
        'GENERATION_FAILED',
        `${modelInfo.name} failed: ${e instanceof Error ? e.message.slice(0, 100) : 'Unknown error'}. Try a different model.`,
        500
      );
    }
  } catch (error) {
    console.error('Image generation error:', error);
    return errorResponse('GENERATION_FAILED', 'Image generation failed.', 500);
  }
}
