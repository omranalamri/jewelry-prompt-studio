import { NextRequest } from 'next/server';
import Replicate from 'replicate';
import { IMAGE_MODELS, getImageModel, getBestImageModel, formatCost, ModelInfo } from '@/lib/creative/model-registry';
import { getDb } from '@/lib/db';

export const maxDuration = 120;

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

// When we have a reference image, we TRANSFORM it — not recreate from scratch.
// The jewelry piece must stay IDENTICAL. Only the environment changes.
function buildTransformPrompt(prompt: string, hasReference: boolean): string {
  if (!hasReference) return prompt;

  return `IMPORTANT: Keep the jewelry piece from the reference image EXACTLY as it is — same design, same shape, same engravings, same text, same stones, same metal color. Do NOT recreate or reimagine the jewelry piece. Only change the styling around it.

Apply these creative changes to the scene while preserving the exact jewelry piece: ${prompt}

The jewelry must be pixel-accurate to the reference — if it has letters, keep the exact letters. If it has a specific shape, keep that exact shape. Only transform the lighting, background, composition, and styling.`;
}

async function runModel(
  replicate: Replicate,
  modelInfo: ModelInfo,
  cleanPrompt: string,
  ar: string,
  referenceImageUrl?: string
): Promise<string> {
  const hasRef = !!referenceImageUrl;
  const transformPrompt = buildTransformPrompt(cleanPrompt, hasRef);

  if (modelInfo.id === 'recraft-v3') {
    if (!process.env.RECRAFT_API_TOKEN) throw new Error('not configured');
    const response = await fetch('https://external.api.recraft.ai/v1/images/generations', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RECRAFT_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: transformPrompt,
        style: 'realistic_image',
        size: ar === '9:16' ? '1024x1820' : ar === '1:1' ? '1024x1024' : '1365x1024',
      }),
    });
    if (!response.ok) throw new Error(`${response.status}`);
    const data = await response.json();
    const url = data.data?.[0]?.url;
    if (!url) throw new Error('no image');
    return url;
  }

  if (modelInfo.id === 'flux-ultra') {
    const output = await replicate.run('black-forest-labs/flux-1.1-pro-ultra', {
      input: {
        prompt: transformPrompt,
        aspect_ratio: ar,
        raw: true,
        output_format: 'jpg',
        // HIGH reference strength when we have a reference — 70% image, 30% prompt
        ...(hasRef && { image_prompt: referenceImageUrl, image_prompt_strength: 0.7 }),
      },
    });
    return typeof output === 'string' ? output : String(output);
  }

  if (modelInfo.id === 'ideogram-v2') {
    const output = await replicate.run('ideogram-ai/ideogram-v2', {
      input: { prompt: transformPrompt, aspect_ratio: ar },
    });
    return Array.isArray(output) ? String(output[0]) : String(output);
  }

  // Nano Banana 2 and Pro — best for image transformation with reference
  const output = await replicate.run(modelInfo.replicateId as `${string}/${string}`, {
    input: {
      prompt: hasRef
        ? `Transform this jewelry photo: keep the EXACT jewelry piece unchanged (same design, shape, text, engravings, stones), but apply new creative styling: ${cleanPrompt}`
        : cleanPrompt,
      resolution: modelInfo.id === 'nano-banana-pro' ? '2K' : '1K',
      aspect_ratio: ar,
      output_format: 'jpg',
      ...(modelInfo.id === 'nano-banana-pro' && { safety_filter_level: 'block_only_high' }),
      // Pass the reference as image input — Nano Banana uses this to preserve the piece
      ...(hasRef && { image_input: [referenceImageUrl] }),
    },
  });
  return Array.isArray(output) ? String(output[0]) : String(output);
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, platform, aspectRatio, model: requestedModelId, referenceImageUrl } = await req.json();

    if (!prompt) return errorResponse('MISSING_PROMPT', 'No prompt provided.', 400);
    if (!process.env.REPLICATE_API_TOKEN) return errorResponse('NOT_CONFIGURED', 'Image generation not configured.', 503);

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    const cleanPrompt = prompt
      .replace(/--ar\s+\S+/g, '').replace(/--style\s+\S+/g, '')
      .replace(/--v\s+\S+/g, '').replace(/--q\s+\S+/g, '')
      .replace(/--no\s+.*/g, '').trim();

    const arMatch = prompt.match(/--ar\s+(\d+:\d+)/);
    const ar = arMatch ? arMatch[1] : (aspectRatio || '1:1');

    const requested = requestedModelId ? getImageModel(requestedModelId) : getBestImageModel();
    const chain = requested
      ? [requested, ...IMAGE_MODELS.filter(m => m.id !== requested.id)]
      : IMAGE_MODELS;

    for (const modelInfo of chain) {
      try {
        const startTime = Date.now();
        const resultUrl = await runModel(replicate, modelInfo, cleanPrompt, ar, referenceImageUrl);
        const elapsed = (Date.now() - startTime) / 1000;

        // Auto-save to repository
        try {
          const sql = getDb();
          await sql`INSERT INTO repository (category, title, description, image_url, tags, metadata)
            VALUES ('generated', ${modelInfo.name + ' — ' + new Date().toLocaleDateString()}, ${cleanPrompt.slice(0, 300)}, ${resultUrl}, ${[platform || 'image', modelInfo.id]}, ${JSON.stringify({ model: modelInfo.name, cost: modelInfo.costEstimate, time: elapsed, platform })})`;
        } catch { /* non-critical */ }

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
            requestedModel: requestedModelId || chain[0].id,
            wasFirstChoice: modelInfo.id === (requestedModelId || chain[0].id),
            hadReference: !!referenceImageUrl,
          },
        });
      } catch {
        continue;
      }
    }

    return errorResponse('GENERATION_FAILED', 'All models are currently unavailable. Please try again.', 500);
  } catch (error) {
    console.error('Image generation error:', error);
    return errorResponse('GENERATION_FAILED', 'Image generation failed.', 500);
  }
}
