import { NextRequest } from 'next/server';
import Replicate from 'replicate';
import { getDb } from '@/lib/db';
import { logCost } from '@/lib/cost-tracker';
import { guardRoute } from '@/lib/auth/route-guard';
import { logError } from '@/lib/observability/logger';

export const maxDuration = 120;

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

// Jewelry type determines how we prompt the try-on
const TRYON_PROMPTS: Record<string, string> = {
  ring: 'Place this exact ring on the ring finger of an elegant hand. Show the ring being worn naturally, hand slightly curved. Keep the exact ring design, metal, and stones unchanged.',
  necklace: 'Place this exact necklace on a model, draped naturally along the collarbones and décolletage. Keep the exact necklace design, chain, and pendant unchanged.',
  earrings: 'Place these exact earrings on a model, visible in 3/4 profile with hair swept back. Keep the exact earring design unchanged.',
  bracelet: 'Place this exact bracelet on a wrist, shown at a natural angle with the hand relaxed. Keep the exact bracelet design unchanged.',
  pendant: 'Place this exact pendant on a model, hanging at the natural sternum position from its chain. Keep the exact pendant design and any text/engravings unchanged.',
  watch: 'Place this exact watch on a wrist, inner wrist facing camera showing the dial clearly. Keep the exact watch design unchanged.',
};

export async function POST(req: NextRequest) {
  const guard = await guardRoute(req, { limiter: 'image', prefix: 'tryon' });
  if (!guard.ok) return guard.response;

  try {
    const { jewelryImageUrl, jewelryType, modelPreference, backgroundStyle } = await req.json();

    if (!jewelryImageUrl) return errorResponse('MISSING_IMAGE', 'Upload your jewelry piece.', 400);
    if (!process.env.REPLICATE_API_TOKEN) return errorResponse('NOT_CONFIGURED', 'Generation not configured.', 503);

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    const typePrompt = TRYON_PROMPTS[jewelryType] || TRYON_PROMPTS.ring;

    // Build the full try-on prompt
    const modelDesc = modelPreference || 'elegant feminine hands with warm medium skin tone, natural manicure';
    const bgDesc = backgroundStyle || 'soft neutral background with professional studio lighting';

    const prompt = `Virtual jewelry try-on: ${typePrompt}

Model: ${modelDesc}
Background: ${bgDesc}
Photography: professional jewelry marketing photography, sharp focus on the jewelry piece, natural skin texture, realistic proportions.
CRITICAL: The jewelry piece must be IDENTICAL to the reference — same design, shape, metal color, stones, engravings. Only add the body/hand and change the environment.`;

    const startTime = Date.now();

    // Use Nano Banana Pro with image reference for best design fidelity
    const output = await replicate.run('google/nano-banana-pro', {
      input: {
        prompt,
        image_input: [jewelryImageUrl],
        resolution: '2K',
        aspect_ratio: jewelryType === 'necklace' || jewelryType === 'earrings' ? '3:4' : '1:1',
        output_format: 'jpg',
        safety_filter_level: 'block_only_high',
      },
    });

    const resultUrl = Array.isArray(output) ? String(output[0]) : String(output);
    const elapsed = (Date.now() - startTime) / 1000;

    // Auto-save
    try {
      const sql = getDb();
      await sql`INSERT INTO repository (category, title, description, image_url, tags, metadata)
        VALUES ('generated', ${'Try-On — ' + jewelryType + ' — ' + new Date().toLocaleDateString()}, ${prompt.slice(0, 200)}, ${resultUrl}, ${['tryon', jewelryType]}, '{}')`;
    } catch { /* non-critical */ }

    logCost({ model: 'Nano Banana Pro', type: 'image', cost: 0.134, durationSeconds: elapsed, promptPreview: `Try-on: ${jewelryType}`, resultUrl });

    return Response.json({
      success: true,
      data: {
        resultUrl,
        model: 'Nano Banana Pro',
        cost: '$0.13',
        timeSeconds: parseFloat(elapsed.toFixed(1)),
        jewelryType,
      },
    });
  } catch (error) {
    logError(error, { route: '/api/tryon', actor: guard.actor.userId });
    return errorResponse('TRYON_FAILED', 'Virtual try-on failed. Please try again.', 500);
  }
}
