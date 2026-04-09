import { NextRequest } from 'next/server';
import Replicate from 'replicate';

export const maxDuration = 120;

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, platform, aspectRatio } = await req.json();

    if (!prompt) {
      return errorResponse('MISSING_PROMPT', 'No prompt provided.', 400);
    }

    if (!process.env.REPLICATE_API_TOKEN) {
      return errorResponse('NOT_CONFIGURED', 'Image generation not configured (missing REPLICATE_API_TOKEN).', 503);
    }

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    if (platform === 'dalle') {
      // Use Recraft for product photography if available, else Nano Banana
      if (process.env.RECRAFT_API_TOKEN) {
        const response = await fetch('https://external.api.recraft.ai/v1/images/generations', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RECRAFT_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
            style: 'realistic_image',
            size: aspectRatio === '9:16' ? '1024x1820' : aspectRatio === '1:1' ? '1024x1024' : '1365x1024',
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const imageUrl = data.data?.[0]?.url;
          if (imageUrl) {
            return Response.json({
              success: true,
              data: { id: crypto.randomUUID(), provider: 'recraft', status: 'completed', resultUrl: imageUrl },
            });
          }
        }
        // Fall through to Nano Banana if Recraft fails
      }

      // Nano Banana (Google Gemini image gen) via Replicate
      const output = await replicate.run('google/nano-banana', {
        input: {
          prompt,
          aspect_ratio: aspectRatio || '1:1',
          output_format: 'webp',
        },
      });
      const resultUrl = Array.isArray(output) ? String(output[0]) : String(output);
      return Response.json({
        success: true,
        data: { id: crypto.randomUUID(), provider: 'nano-banana', status: 'completed', resultUrl },
      });
    }

    // Midjourney-style: use Flux Pro, fall back to Nano Banana
    const cleanPrompt = prompt
      .replace(/--ar\s+\S+/g, '')
      .replace(/--style\s+\S+/g, '')
      .replace(/--v\s+\S+/g, '')
      .replace(/--q\s+\S+/g, '')
      .replace(/--no\s+.*/g, '')
      .trim();

    const arMatch = prompt.match(/--ar\s+(\d+:\d+)/);
    const ar = arMatch ? arMatch[1] : (aspectRatio || '1:1');

    try {
      // Try Flux Pro first
      const arMap: Record<string, { width: number; height: number }> = {
        '1:1': { width: 1024, height: 1024 },
        '4:5': { width: 896, height: 1120 },
        '5:4': { width: 1120, height: 896 },
        '16:9': { width: 1344, height: 768 },
        '9:16': { width: 768, height: 1344 },
        '3:2': { width: 1216, height: 832 },
        '2:3': { width: 832, height: 1216 },
      };
      const dims = arMap[ar] || arMap['1:1'];

      const output = await replicate.run('black-forest-labs/flux-1.1-pro', {
        input: { prompt: cleanPrompt, width: dims.width, height: dims.height, prompt_upsampling: true },
      });
      const resultUrl = typeof output === 'string' ? output : String(output);
      return Response.json({
        success: true,
        data: { id: crypto.randomUUID(), provider: 'replicate-flux', status: 'completed', resultUrl },
      });
    } catch {
      // Fallback to Nano Banana
      const output = await replicate.run('google/nano-banana', {
        input: { prompt: cleanPrompt, aspect_ratio: ar, output_format: 'webp' },
      });
      const resultUrl = Array.isArray(output) ? String(output[0]) : String(output);
      return Response.json({
        success: true,
        data: { id: crypto.randomUUID(), provider: 'nano-banana', status: 'completed', resultUrl },
      });
    }
  } catch (error) {
    console.error('Image generation error:', error);
    return errorResponse('GENERATION_FAILED', 'Image generation failed. Please try again.', 500);
  }
}
