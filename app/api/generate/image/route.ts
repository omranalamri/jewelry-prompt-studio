import { NextRequest } from 'next/server';
import Replicate from 'replicate';

export const maxDuration = 120;

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, platform, aspectRatio, negativePrompt } = await req.json();

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

    // Parse aspect ratio from MJ prompt
    const arMatch = prompt.match(/--ar\s+(\d+:\d+)/);
    const ar = arMatch ? arMatch[1] : (aspectRatio || '1:1');

    if (platform === 'dalle') {
      // DALL-E prompts → Nano Banana Pro (Google's best, 2K resolution)
      try {
        const output = await replicate.run('google/nano-banana-pro', {
          input: {
            prompt: cleanPrompt,
            resolution: '2K',
            aspect_ratio: ar,
            output_format: 'jpg',
            safety_filter_level: 'block_only_high',
          },
        });
        const resultUrl = Array.isArray(output) ? String(output[0]) : String(output);
        return Response.json({
          success: true,
          data: {
            id: crypto.randomUUID(),
            provider: 'nano-banana-pro',
            model: 'google/nano-banana-pro',
            status: 'completed',
            resultUrl,
          },
        });
      } catch (e) {
        console.error('Nano Banana Pro failed, trying Recraft:', e);
        // Fallback to Recraft
        if (process.env.RECRAFT_API_TOKEN) {
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
                data: { id: crypto.randomUUID(), provider: 'recraft', model: 'recraft-v3', status: 'completed', resultUrl: imageUrl },
              });
            }
          }
        }
        throw e;
      }
    }

    // Midjourney prompts → Flux 1.1 Pro Ultra (4MP, raw realism mode)
    try {
      const output = await replicate.run('black-forest-labs/flux-1.1-pro-ultra', {
        input: {
          prompt: cleanPrompt,
          aspect_ratio: ar,
          raw: true,
          output_format: 'jpg',
        },
      });
      const resultUrl = typeof output === 'string' ? output : String(output);
      return Response.json({
        success: true,
        data: {
          id: crypto.randomUUID(),
          provider: 'flux-ultra',
          model: 'black-forest-labs/flux-1.1-pro-ultra',
          status: 'completed',
          resultUrl,
        },
      });
    } catch {
      // Fallback: Nano Banana 2 (fast, great quality)
      const output = await replicate.run('google/nano-banana-2', {
        input: {
          prompt: cleanPrompt,
          resolution: '1K',
          aspect_ratio: ar,
          output_format: 'jpg',
        },
      });
      const resultUrl = Array.isArray(output) ? String(output[0]) : String(output);
      return Response.json({
        success: true,
        data: {
          id: crypto.randomUUID(),
          provider: 'nano-banana-2',
          model: 'google/nano-banana-2',
          status: 'completed',
          resultUrl,
        },
      });
    }
  } catch (error) {
    console.error('Image generation error:', error);
    return errorResponse('GENERATION_FAILED', 'Image generation failed. Please try again.', 500);
  }
}
