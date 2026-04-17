import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { logCost } from '@/lib/cost-tracker';
import { trackGeneration } from '@/lib/learning/generation-tracker';
import { validatePromptWithLearned as validatePrompt } from '@/lib/jewelry/validation';
import { generateVideo, generateImage, formatCostGoogle, isGeminiConfigured, PRICING } from '@/lib/gemini';
import { saveToBlob } from '@/lib/blob-storage';
import { put } from '@vercel/blob';
import { guardRoute } from '@/lib/auth/route-guard';
import { logError } from '@/lib/observability/logger';

export const maxDuration = 300;

/**
 * POST /api/generate/video
 *
 * Video generation on Veo 3.1 — aligned with the Gemini-only policy.
 * Previous Replicate/Kling/Seedance/Runway paths have been removed.
 *
 * Flow:
 *   1. Optionally generate a start frame with Gemini 3 Pro Image (when no
 *      referenceImageUrl is supplied). The frame is used as `image` input
 *      for Veo so the video starts from a known composition.
 *   2. Call Veo 3.1 with the prompt + start frame, duration 5-10s.
 *   3. Persist the MP4 to Vercel Blob.
 *
 * Hardening:
 *   • Admin-gated + video-tier rate limit (10/min) via guardRoute.
 *   • Input caps: duration bounded to 5-10, prompt trimmed to 2 KB.
 */

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

type VeoModelShort = 'veo-3.1' | 'veo-3.1-fast' | 'veo-3.1-lite' | 'veo-2';

const VEO_MODEL_MAP: Record<VeoModelShort, string> = {
  'veo-3.1': 'veo-3.1-generate-preview',
  'veo-3.1-fast': 'veo-3.1-fast-generate-preview',
  'veo-3.1-lite': 'veo-3.1-lite-generate-preview',
  'veo-2': 'veo-2.0-generate-001',
};

export async function POST(req: NextRequest) {
  const guard = await guardRoute(req, { limiter: 'video', prefix: 'video' });
  if (!guard.ok) return guard.response;

  try {
    const body = await req.json() as {
      prompt?: string;
      duration?: number;
      aspectRatio?: string;
      referenceImageUrl?: string;
      model?: string;
    };

    const prompt = typeof body.prompt === 'string' ? body.prompt.slice(0, 2000) : '';
    if (!prompt) return errorResponse('MISSING_PROMPT', 'No prompt.', 400);
    if (!isGeminiConfigured()) return errorResponse('NOT_CONFIGURED', 'Gemini not configured.', 503);

    const duration = Math.min(Math.max(Number(body.duration ?? 8), 5), 10);
    const modelShort = (Object.keys(VEO_MODEL_MAP).includes(body.model || '') ? body.model : 'veo-3.1') as VeoModelShort;
    const fullModelId = VEO_MODEL_MAP[modelShort];
    const pricing = PRICING[fullModelId as keyof typeof PRICING];
    const perSecondCost = pricing?.cost ?? 0.5;

    // Validate and correct jewelry-specific prompt issues
    let validatedPrompt = prompt;
    const validation = validatePrompt(prompt);
    if (validation.correctionCount > 0) validatedPrompt = validation.correctedPrompt;

    // ── Step 1: choose a start frame ──
    // Prefer the user's reference image (preserves exact jewelry design).
    // If none, generate one with Gemini 3 Pro Image.
    let startFrameUrl: string | null = null;
    let frameCost = 0;

    if (body.referenceImageUrl) {
      startFrameUrl = body.referenceImageUrl;
    } else {
      try {
        const frame = await generateImage(
          `Production-ready video still frame. ${validatedPrompt}`,
          undefined,
        );
        const buf = Buffer.from(frame.imageBase64, 'base64');
        const ext = frame.mimeType.includes('png') ? 'png' : 'jpg';
        const blob = await put(`video-frame/${crypto.randomUUID()}.${ext}`, buf, {
          access: 'public', contentType: frame.mimeType,
        });
        startFrameUrl = blob.url;
        frameCost = frame.cost;
      } catch (e) {
        logError(e, { route: '/api/generate/video', stage: 'frame' });
        return errorResponse('FRAME_FAILED', 'Could not generate starting frame.', 503);
      }
    }

    // ── Step 2: Veo 3.1 video generation ──
    const startTime = Date.now();
    try {
      const veoResult = await generateVideo(
        validatedPrompt,
        startFrameUrl || undefined,
        fullModelId,
        duration,
      );

      // Persist the video in Vercel Blob (Veo URLs are short-lived)
      const permanentUrl = await saveToBlob(veoResult.videoUrl, 'video');
      const elapsed = (Date.now() - startTime) / 1000;
      const totalCost = veoResult.cost + frameCost;

      try {
        const sql = getDb();
        await sql`
          INSERT INTO repository (category, title, description, image_url, tags, prompt_text, model_used, reference_url)
          VALUES (
            'video',
            ${`Video — ${pricing?.label ?? modelShort} — ${new Date().toLocaleDateString()}`},
            ${`${duration}s on ${pricing?.label ?? modelShort}`},
            ${permanentUrl},
            ${['video', modelShort]},
            ${validatedPrompt.slice(0, 300)},
            ${pricing?.label ?? modelShort},
            ${body.referenceImageUrl ?? null}
          )
        `;
      } catch (dbErr) {
        logError(dbErr, { route: '/api/generate/video', stage: 'repo-insert' });
      }

      void logCost({
        model: pricing?.label ?? modelShort,
        type: 'video',
        cost: totalCost,
        durationSeconds: elapsed,
        promptPreview: validatedPrompt.slice(0, 120),
        resultUrl: permanentUrl,
      });

      const genId = await trackGeneration({
        promptText: validatedPrompt,
        generationModel: modelShort,
        generationType: 'video',
        referenceImageUrl: body.referenceImageUrl,
        resultUrl: permanentUrl,
        cost: totalCost,
        durationSeconds: elapsed,
      });

      return Response.json({
        success: true,
        data: {
          id: genId ?? crypto.randomUUID(),
          provider: 'google-veo',
          model: pricing?.label ?? modelShort,
          modelId: modelShort,
          status: 'completed',
          resultUrl: permanentUrl,
          startFrameUrl,
          duration,
          cost: formatCostGoogle(totalCost),
          costRaw: totalCost,
          timeSeconds: parseFloat(elapsed.toFixed(1)),
        },
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unknown';
      logError(e, { route: '/api/generate/video', stage: 'veo-call', actor: guard.actor.userId });
      if (/unavailable|capacity|overload/i.test(msg)) {
        return errorResponse('MODEL_BUSY', `${pricing?.label ?? modelShort} is at capacity. Retry shortly.`, 503);
      }
      return errorResponse('VIDEO_ERROR', `Video generation failed: ${msg.slice(0, 100)}`, 500);
    }
  } catch (error) {
    logError(error, { route: '/api/generate/video', actor: guard.actor.userId });
    return errorResponse('GENERATION_FAILED', 'Video generation failed.', 500);
  }
}
