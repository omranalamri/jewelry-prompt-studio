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

    if (platform === 'dalle' && process.env.RECRAFT_API_TOKEN) {
      // Use Recraft for DALL-E style product photography
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

      if (!response.ok) {
        const err = await response.text();
        console.error('Recraft error:', response.status, err);
        return errorResponse('RECRAFT_ERROR', `Image generation failed (${response.status})`, 500);
      }

      const data = await response.json();
      const imageUrl = data.data?.[0]?.url;

      if (!imageUrl) {
        return errorResponse('RECRAFT_ERROR', 'No image returned from Recraft.', 500);
      }

      return Response.json({
        success: true,
        data: {
          id: crypto.randomUUID(),
          provider: 'recraft',
          status: 'completed',
          resultUrl: imageUrl,
        },
      });
    }

    // Use Replicate Flux for Midjourney-style images
    if (!process.env.REPLICATE_API_TOKEN) {
      return errorResponse('NOT_CONFIGURED', 'Image generation is not configured (missing REPLICATE_API_TOKEN).', 503);
    }

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    // Strip Midjourney-specific parameters for Flux
    const cleanPrompt = prompt
      .replace(/--ar\s+\S+/g, '')
      .replace(/--style\s+\S+/g, '')
      .replace(/--v\s+\S+/g, '')
      .replace(/--q\s+\S+/g, '')
      .replace(/--no\s+.*/g, '')
      .trim();

    // Parse aspect ratio from prompt if present
    const arMatch = prompt.match(/--ar\s+(\d+:\d+)/);
    const ar = arMatch ? arMatch[1] : (aspectRatio || '1:1');

    // Map aspect ratio to width/height for Flux
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
      input: {
        prompt: cleanPrompt,
        width: dims.width,
        height: dims.height,
        prompt_upsampling: true,
      },
    });

    // Flux returns a URL string or FileOutput
    const resultUrl = typeof output === 'string' ? output : String(output);

    return Response.json({
      success: true,
      data: {
        id: crypto.randomUUID(),
        provider: 'replicate',
        status: 'completed',
        resultUrl,
      },
    });
  } catch (error) {
    console.error('Image generation error:', error);
    return errorResponse('GENERATION_FAILED', 'Image generation failed. Please try again.', 500);
  }
}
