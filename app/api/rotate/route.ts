import { NextRequest } from 'next/server';
import Replicate from 'replicate';
import { logCost } from '@/lib/cost-tracker';
import { trackGeneration } from '@/lib/learning/generation-tracker';
import { getDb } from '@/lib/db';

export const maxDuration = 300;

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const { jewelryImageUrl, jewelryType, background, duration } = await req.json();

    if (!jewelryImageUrl) return errorResponse('MISSING_IMAGE', 'Upload a jewelry image.', 400);
    if (!process.env.REPLICATE_API_TOKEN) return errorResponse('NOT_CONFIGURED', 'Not configured.', 503);

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    // Step 1: Generate a clean product frame with the jewelry centered
    const bgDesc = background === 'dark' ? 'deep black seamless background' :
      background === 'marble' ? 'white marble surface with soft shadows' :
        background === 'gradient' ? 'smooth dark-to-light gradient background' : 'clean white seamless background';

    const framePrompt = `Transform this jewelry photo: keep the exact ${jewelryType || 'jewelry'} piece unchanged, place it centered on ${bgDesc}, professional product photography lighting from above with soft fill, the piece should be perfectly centered and isolated for a 360 rotation video, no hands or props`;

    const frameOutput = await replicate.run('google/nano-banana-pro', {
      input: {
        prompt: framePrompt,
        image_input: [jewelryImageUrl],
        resolution: '2K',
        aspect_ratio: '1:1',
        output_format: 'jpg',
        safety_filter_level: 'block_only_high',
      },
    });
    const frameUrl = Array.isArray(frameOutput) ? String(frameOutput[0]) : String(frameOutput);

    // Step 2: Animate as a slow 360 rotation
    const rotatePrompt = `Slow smooth 360 degree orbital rotation around this ${jewelryType || 'jewelry'} piece, the camera orbits steadily around the product revealing all angles, consistent lighting throughout rotation, professional product turntable video, clean background stays static while the piece rotates`;

    const prediction = await replicate.predictions.create({
      model: 'bytedance/seedance-1.5-pro',
      input: {
        prompt: rotatePrompt,
        image: frameUrl,
        duration: duration || 5,
        aspect_ratio: '1:1',
        camera_fixed: false,
        generate_audio: false,
      },
    });

    const cost = 0.13 + 0.40; // frame + video
    logCost({ model: 'Seedance 1.5 Pro', type: 'video', cost, promptPreview: '360 rotation' });
    trackGeneration({ promptText: rotatePrompt, generationModel: 'seedance', generationType: 'video', referenceImageUrl: jewelryImageUrl, cost });

    // Save frame to repo
    try {
      const sql = getDb();
      await sql`INSERT INTO repository (category, title, image_url, tags, prompt_text, model_used, reference_url)
        VALUES ('generated', ${'Rotation Frame — ' + (jewelryType || 'jewelry')}, ${frameUrl}, ${['rotation', 'frame', jewelryType || 'jewelry']}, ${framePrompt}, 'Nano Banana Pro', ${jewelryImageUrl})`;
    } catch { /* */ }

    return Response.json({
      success: true,
      data: {
        id: prediction.id,
        provider: 'replicate',
        model: 'Seedance 1.5 Pro',
        status: 'processing',
        frameUrl,
        cost: `$${cost.toFixed(2)}`,
        estimatedTime: 60,
      },
    });
  } catch (error) {
    console.error('Rotation error:', error);
    return errorResponse('ROTATION_FAILED', 'Rotation video failed.', 500);
  }
}
