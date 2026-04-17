import { NextRequest } from 'next/server';
import { logCost } from '@/lib/cost-tracker';
import { getDb } from '@/lib/db';
import { generateVideo, formatCostGoogle, isGeminiConfigured, PRICING } from '@/lib/gemini';
import { saveToBlob } from '@/lib/blob-storage';
import { guardRoute } from '@/lib/auth/route-guard';
import { logError } from '@/lib/observability/logger';

export const maxDuration = 300;

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

interface StitchFrame {
  imageUrl: string;
  label: string;
  motion?: string;
}

export async function POST(req: NextRequest) {
  const guard = await guardRoute(req, { limiter: 'video', prefix: 'stitch' });
  if (!guard.ok) return guard.response;

  try {
    const {
      frames,
      videoModel = 'veo-3.1', // PRIMARY: Veo 3.1 standard (best for jewelry sparkle physics)
      motionPrompt,
      duration = 8,
    } = await req.json() as {
      frames: StitchFrame[];
      videoModel?: string;
      motionPrompt?: string;
      duration?: number;
    };

    if (!frames?.length) return errorResponse('NO_FRAMES', 'Provide frames to animate.', 400);
    if (frames.length > 12) return errorResponse('TOO_MANY', 'Max 12 frames per stitch.', 400);
    if (!isGeminiConfigured()) return errorResponse('NOT_CONFIGURED', 'Google AI API key not set.', 503);

    const startTime = Date.now();
    const defaultMotion = motionPrompt || 'Slow elegant camera drift, subtle sparkle on jewelry, gentle light movement, cinematic jewelry commercial';

    // Map short names to full model IDs
    const modelMap: Record<string, string> = {
      'veo-3.1-fast': 'veo-3.1-fast-generate-preview',
      'veo-3.1-lite': 'veo-3.1-lite-generate-preview',
      'veo-3.1': 'veo-3.1-generate-preview',
      'veo-2': 'veo-2.0-generate-001',
    };
    const fullModelId = modelMap[videoModel] || modelMap['veo-3.1'];
    const pricing = PRICING[fullModelId as keyof typeof PRICING];
    const perSecondCost = pricing?.cost || 0.50;

    const clips: {
      index: number;
      label: string;
      imageUrl: string;
      videoUrl: string | null;
      status: 'completed' | 'failed';
      error: string | null;
      cost: number;
      model: string;
    }[] = [];

    let totalCost = 0;

    // Generate videos one at a time (Veo is heavy, long-running)
    for (let i = 0; i < frames.length; i++) {
      const frame = frames[i];
      const frameMotion = frame.motion || defaultMotion;

      try {
        const result = await generateVideo(frameMotion, frame.imageUrl, fullModelId, duration);

        // Download and save to Blob permanently
        const permanentUrl = await saveToBlob(result.videoUrl, 'video');

        clips.push({
          index: i,
          label: frame.label,
          imageUrl: frame.imageUrl,
          videoUrl: permanentUrl,
          status: 'completed',
          error: null,
          cost: result.cost,
          model: pricing?.label || videoModel,
        });
        totalCost += result.cost;

        // Save to repository
        try {
          const sql = getDb();
          await sql`INSERT INTO repository (category, title, description, image_url, tags)
            VALUES ('video', ${`${frame.label} — ${pricing?.label || videoModel}`}, ${`${duration}s animated clip`}, ${permanentUrl}, ${['video', videoModel, frame.label]})`;
        } catch { /* */ }

      } catch (e) {
        clips.push({
          index: i,
          label: frame.label,
          imageUrl: frame.imageUrl,
          videoUrl: null,
          status: 'failed',
          error: e instanceof Error ? e.message.slice(0, 80) : 'Video generation failed',
          cost: 0,
          model: pricing?.label || videoModel,
        });
      }
    }

    const totalTime = (Date.now() - startTime) / 1000;
    const successCount = clips.filter(c => c.status === 'completed').length;

    logCost({
      model: pricing?.label || videoModel,
      type: 'video',
      cost: totalCost,
      durationSeconds: totalTime,
      promptPreview: `Stitch: ${successCount}/${frames.length} clips`,
      resultUrl: clips.find(c => c.videoUrl)?.videoUrl || '',
    });

    return Response.json({
      success: true,
      data: {
        stitchId: crypto.randomUUID(),
        totalFrames: frames.length,
        successCount,
        failCount: frames.length - successCount,
        videoModel: pricing?.label || videoModel,
        totalCost: formatCostGoogle(totalCost),
        totalCostRaw: totalCost,
        totalTimeSeconds: parseFloat(totalTime.toFixed(1)),
        clips,
      },
    });
  } catch (error) {
    logError(error, { route: '/api/generate/stitch', actor: guard.actor.userId });
    return errorResponse('STITCH_FAILED', 'Video stitching failed.', 500);
  }
}
