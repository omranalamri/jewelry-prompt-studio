import { NextRequest } from 'next/server';
import Replicate from 'replicate';

export const maxDuration = 60;

// Step 1 of the pipeline: Clean up the customer's jewelry photo
// - Remove background → isolated piece on transparent/white
// - The cleaned image becomes the control_image for Flux Canny Pro

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const { imageUrl } = await req.json();

    if (!imageUrl) return errorResponse('MISSING_IMAGE', 'Image URL required.', 400);
    if (!process.env.REPLICATE_API_TOKEN) return errorResponse('NOT_CONFIGURED', 'Not configured.', 503);

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    // Remove background — isolate the jewelry piece
    const output = await replicate.run('lucataco/remove-bg', {
      input: { image: imageUrl },
    });

    const cleanedUrl = typeof output === 'string' ? output : String(output);

    return Response.json({
      success: true,
      data: {
        originalUrl: imageUrl,
        cleanedUrl, // transparent background, isolated piece
        message: 'Background removed. This cleaned image will be used as the shape reference for generation.',
      },
    });
  } catch (error) {
    console.error('Prepare error:', error);
    // If BG removal fails, return the original — still usable
    const { imageUrl } = await req.json().catch(() => ({ imageUrl: '' }));
    return Response.json({
      success: true,
      data: { originalUrl: imageUrl, cleanedUrl: imageUrl, message: 'Using original image (BG removal unavailable).' },
    });
  }
}
