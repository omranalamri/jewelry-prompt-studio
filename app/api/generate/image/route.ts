import { NextRequest } from 'next/server';
import Replicate from 'replicate';

export const maxDuration = 120;

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

// Available image generation models
const IMAGE_MODELS = {
  'nano-banana-2': {
    replicateId: 'google/nano-banana-2',
    name: 'Nano Banana 2',
    description: 'Google\'s fast image gen with character consistency & multi-image fusion',
  },
  'nano-banana-pro': {
    replicateId: 'google/nano-banana-pro',
    name: 'Nano Banana Pro',
    description: 'Google\'s state-of-the-art image generation, 2K resolution',
  },
  'flux-ultra': {
    replicateId: 'black-forest-labs/flux-1.1-pro-ultra',
    name: 'Flux 1.1 Pro Ultra',
    description: '4 megapixel images with raw realism mode',
  },
  'recraft-v3': {
    replicateId: 'recraft-v3',
    name: 'Recraft V3',
    description: 'Excellent product photography',
  },
} as const;

type ImageModelId = keyof typeof IMAGE_MODELS;

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

    // Strip Midjourney-specific parameters
    const cleanPrompt = prompt
      .replace(/--ar\s+\S+/g, '')
      .replace(/--style\s+\S+/g, '')
      .replace(/--v\s+\S+/g, '')
      .replace(/--q\s+\S+/g, '')
      .replace(/--no\s+.*/g, '')
      .trim();

    const arMatch = prompt.match(/--ar\s+(\d+:\d+)/);
    const ar = arMatch ? arMatch[1] : (aspectRatio || '1:1');

    // Determine which model to use
    // Priority: user-requested model > platform default
    let modelId: ImageModelId;
    if (requestedModel && requestedModel in IMAGE_MODELS) {
      modelId = requestedModel as ImageModelId;
    } else if (platform === 'dalle') {
      modelId = 'nano-banana-pro'; // best for product photography
    } else {
      modelId = 'nano-banana-pro'; // default: Nano Banana Pro (2K, most reliable)
    }

    // Generate with selected model, with fallback chain
    const modelChain: ImageModelId[] = [modelId];
    // Add fallbacks — Pro first (most reliable), then 2, then Flux
    if (modelId !== 'nano-banana-pro') modelChain.push('nano-banana-pro');
    if (modelId !== 'nano-banana-2') modelChain.push('nano-banana-2');
    if (modelId !== 'flux-ultra') modelChain.push('flux-ultra');

    for (const mid of modelChain) {
      try {
        const modelConfig = IMAGE_MODELS[mid];

        if (mid === 'recraft-v3' && process.env.RECRAFT_API_TOKEN) {
          // Recraft uses its own API
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
              return Response.json({
                success: true,
                data: { id: crypto.randomUUID(), provider: mid, model: modelConfig.name, status: 'completed', resultUrl: imageUrl },
              });
            }
          }
          continue;
        }

        // Replicate models
        let input: Record<string, unknown>;

        if (mid === 'flux-ultra') {
          input = { prompt: cleanPrompt, aspect_ratio: ar, raw: true, output_format: 'jpg' };
        } else {
          // Nano Banana 2 and Pro
          input = {
            prompt: cleanPrompt,
            resolution: mid === 'nano-banana-pro' ? '2K' : '1K',
            aspect_ratio: ar,
            output_format: 'jpg',
            ...(mid === 'nano-banana-pro' && { safety_filter_level: 'block_only_high' }),
          };
        }

        const output = await replicate.run(modelConfig.replicateId as `${string}/${string}`, { input });
        const resultUrl = Array.isArray(output) ? String(output[0]) : String(output);

        return Response.json({
          success: true,
          data: {
            id: crypto.randomUUID(),
            provider: mid,
            model: modelConfig.name,
            status: 'completed',
            resultUrl,
          },
        });
      } catch (e) {
        console.error(`${mid} failed:`, e instanceof Error ? e.message.slice(0, 100) : e);
        continue;
      }
    }

    return errorResponse('GENERATION_FAILED', 'All image models failed. Please try again.', 500);
  } catch (error) {
    console.error('Image generation error:', error);
    return errorResponse('GENERATION_FAILED', 'Image generation failed. Please try again.', 500);
  }
}
