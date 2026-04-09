import { NextRequest } from 'next/server';
import Replicate from 'replicate';
import { IMAGE_MODELS, getImageModel, getBestImageModel, formatCost } from '@/lib/creative/model-registry';

export const maxDuration = 120;

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, platform, aspectRatio, model: requestedModel } = await req.json();

    if (!prompt) {
      return errorResponse('MISSING_PROMPT', 'No prompt provided.', 400);
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return errorResponse('NOT_CONFIGURED', 'Image generation not configured.', 503);
    }

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    // Strip Midjourney parameters
    const cleanPrompt = prompt
      .replace(/--ar\s+\S+/g, '')
      .replace(/--style\s+\S+/g, '')
      .replace(/--v\s+\S+/g, '')
      .replace(/--q\s+\S+/g, '')
      .replace(/--no\s+.*/g, '')
      .trim();

    const arMatch = prompt.match(/--ar\s+(\d+:\d+)/);
    const ar = arMatch ? arMatch[1] : (aspectRatio || '1:1');

    // Build model chain: requested → best available → fallbacks
    const selectedModel = requestedModel ? getImageModel(requestedModel) : null;
    const best = getBestImageModel();
    const chain = selectedModel
      ? [selectedModel, ...IMAGE_MODELS.filter(m => m.id !== selectedModel.id)]
      : [best, ...IMAGE_MODELS.filter(m => m.id !== best.id)];

    for (const modelInfo of chain) {
      try {
        const startTime = Date.now();

        if (modelInfo.id === 'recraft-v3' && process.env.RECRAFT_API_TOKEN) {
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
          if (response.ok) {
            const data = await response.json();
            const imageUrl = data.data?.[0]?.url;
            if (imageUrl) {
              const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
              return Response.json({
                success: true,
                data: {
                  id: crypto.randomUUID(),
                  provider: modelInfo.id,
                  model: modelInfo.name,
                  status: 'completed',
                  resultUrl: imageUrl,
                  cost: formatCost(modelInfo.costEstimate),
                  costRaw: modelInfo.costEstimate,
                  timeSeconds: parseFloat(elapsed),
                  resolution: modelInfo.resolution,
                  quality: modelInfo.quality,
                },
              });
            }
          }
          continue;
        }

        // Replicate models
        let input: Record<string, unknown>;

        if (modelInfo.id === 'flux-ultra') {
          input = { prompt: cleanPrompt, aspect_ratio: ar, raw: true, output_format: 'jpg' };
        } else if (modelInfo.id === 'ideogram-v2') {
          input = { prompt: cleanPrompt, aspect_ratio: ar };
        } else {
          // Nano Banana 2 and Pro
          input = {
            prompt: cleanPrompt,
            resolution: modelInfo.id === 'nano-banana-pro' ? '2K' : '1K',
            aspect_ratio: ar,
            output_format: 'jpg',
            ...(modelInfo.id === 'nano-banana-pro' && { safety_filter_level: 'block_only_high' }),
          };
        }

        const output = await replicate.run(modelInfo.replicateId as `${string}/${string}`, { input });
        const resultUrl = Array.isArray(output) ? String(output[0]) : String(output);
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

        return Response.json({
          success: true,
          data: {
            id: crypto.randomUUID(),
            provider: modelInfo.id,
            model: modelInfo.name,
            status: 'completed',
            resultUrl,
            cost: formatCost(modelInfo.costEstimate),
            costRaw: modelInfo.costEstimate,
            timeSeconds: parseFloat(elapsed),
            resolution: modelInfo.resolution,
            quality: modelInfo.quality,
          },
        });
      } catch (e) {
        console.error(`${modelInfo.id} failed:`, e instanceof Error ? e.message.slice(0, 100) : e);
        continue;
      }
    }

    return errorResponse('GENERATION_FAILED', 'All image models failed. Please try again.', 500);
  } catch (error) {
    console.error('Image generation error:', error);
    return errorResponse('GENERATION_FAILED', 'Image generation failed.', 500);
  }
}
