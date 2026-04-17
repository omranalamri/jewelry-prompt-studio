import { NextRequest } from 'next/server';
import { put } from '@vercel/blob';
import { getDb } from '@/lib/db';
import { logCost } from '@/lib/cost-tracker';
import { logError } from '@/lib/observability/logger';
import { trackGeneration } from '@/lib/learning/generation-tracker';
import { generateImage as geminiGenerateImage, isGeminiConfigured, formatCostGoogle } from '@/lib/gemini';
import { extractFacts, type ExtractedFacts } from '@/lib/creative/extract-once';
import { synthesize } from '@/lib/creative/synthesize';
import { getImageGenRateLimiter, checkRateLimit } from '@/lib/redis/client';

export const maxDuration = 300;

/**
 * POST /api/generate/from-facts
 *
 * Skip-chat generation path. Takes either:
 *   a) extractedFacts JSON directly (client already ran /api/creative/extract), or
 *   b) referenceImageUrl (+ inspirationImageUrl) and we'll extract inline.
 *
 * Plus a userBrief string ("Instagram Reel for Ramadan, warm golden hour").
 *
 * Pipeline: extract (if needed) → Sonnet synthesis (with prompt caching)
 *           → Gemini 3 Pro image generation.
 *
 * No chat turns, no Q&A. For users who know what they want.
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limit mirror of /api/generate/image
    const limiter = getImageGenRateLimiter();
    if (limiter) {
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous';
      const rl = await checkRateLimit(limiter, ip.split(',')[0].trim());
      if (rl && !rl.success) {
        return Response.json(
          { success: false, error: `Rate limit exceeded`, code: 'RATE_LIMIT' },
          { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.reset - Date.now()) / 1000)) } }
        );
      }
    }

    const body = await req.json() as {
      userBrief?: string;
      extractedFacts?: ExtractedFacts;
      referenceImageUrl?: string;
      inspirationImageUrl?: string;
      platform?: string;
      aspectRatio?: string;
    };

    if (!body.userBrief?.trim()) {
      return Response.json({ success: false, error: 'userBrief required', code: 'MISSING_INPUT' }, { status: 400 });
    }
    if (!isGeminiConfigured()) {
      return Response.json({ success: false, error: 'Gemini not configured', code: 'NOT_CONFIGURED' }, { status: 503 });
    }

    const startTime = Date.now();
    const stages: Array<{ stage: string; costUsd: number; durationMs: number; model: string }> = [];

    // ── Stage 1: Extract facts (or use supplied) ──
    let facts: ExtractedFacts | undefined = body.extractedFacts;
    if (!facts && body.referenceImageUrl) {
      const t0 = Date.now();
      facts = await extractFacts({
        referenceImageUrl: body.referenceImageUrl,
        inspirationImageUrl: body.inspirationImageUrl,
      });
      stages.push({ stage: 'extract', costUsd: 0.012, durationMs: Date.now() - t0, model: facts.visionModel });
    }

    // ── Stage 2: Synthesize the production prompt on Sonnet (cached) ──
    const synth = await synthesize({ userBrief: body.userBrief, extractedFacts: facts });
    stages.push({ stage: 'synthesis', costUsd: synth.costUsd, durationMs: synth.durationMs, model: synth.modelUsed });

    // Extract the actual Gemini prompt from synthesis output
    const parsed = synth.parsed as Record<string, unknown>;
    const prompts = parsed?.prompts as Record<string, string> | undefined;
    const finalPrompt =
      prompts?.geminiImage ||
      (typeof parsed?.concept === 'string' ? `${parsed.concept}. ${body.userBrief}` : body.userBrief);

    // ── Stage 3: Render the image on Gemini 3 Pro ──
    const imageStart = Date.now();
    const imageInputs = body.inspirationImageUrl && body.referenceImageUrl
      ? [body.referenceImageUrl, body.inspirationImageUrl]
      : body.referenceImageUrl
      ? [body.referenceImageUrl]
      : undefined;

    const gem = await geminiGenerateImage(finalPrompt, imageInputs);

    // Save to Vercel Blob
    const buf = Buffer.from(gem.imageBase64, 'base64');
    const ext = gem.mimeType.includes('png') ? 'png' : 'jpg';
    const blob = await put(`from-facts/${crypto.randomUUID()}.${ext}`, buf, {
      access: 'public',
      contentType: gem.mimeType,
    });

    stages.push({ stage: 'render', costUsd: gem.cost, durationMs: Date.now() - imageStart, model: gem.model });

    const elapsed = (Date.now() - startTime) / 1000;
    const totalCost = stages.reduce((s, st) => s + st.costUsd, 0);

    // Persist to repository
    try {
      const sql = getDb();
      await sql`INSERT INTO repository (category, title, description, image_url, tags, prompt_text, model_used, reference_url)
        VALUES ('generated', ${`Skip-chat — ${new Date().toLocaleDateString()}`}, ${body.userBrief.slice(0, 300)}, ${blob.url}, ${['generated', 'from-facts', body.platform || 'image']}, ${finalPrompt}, ${gem.model}, ${body.referenceImageUrl || null})`;
    } catch { /* */ }

    void logCost({
      model: gem.model,
      type: 'image',
      cost: gem.cost,
      durationSeconds: (Date.now() - imageStart) / 1000,
      promptPreview: body.userBrief.slice(0, 120),
      resultUrl: blob.url,
    });

    const genId = await trackGeneration({
      promptText: finalPrompt,
      generationModel: 'gemini-direct',
      generationType: 'image',
      aspectRatio: body.aspectRatio || '1:1',
      wasFirstChoice: true,
      referenceImageUrl: body.referenceImageUrl,
      resultUrl: blob.url,
      cost: totalCost,
      durationSeconds: elapsed,
    });

    return Response.json({
      success: true,
      data: {
        id: genId || crypto.randomUUID(),
        resultUrl: blob.url,
        finalPrompt,
        concept: parsed?.concept ?? null,
        facts: facts ?? null,
        synthesis: {
          model: synth.modelUsed,
          cacheHit: synth.cacheReadTokens > 0,
          cacheReadTokens: synth.cacheReadTokens,
          cacheCreationTokens: synth.cacheCreationTokens,
          inputTokens: synth.inputTokens,
          outputTokens: synth.outputTokens,
        },
        totalCost: formatCostGoogle(totalCost),
        totalCostRaw: totalCost,
        timeSeconds: parseFloat(elapsed.toFixed(1)),
        stages,
        pipelineMode: 'skip-chat',
      },
    });
  } catch (err) {
    logError(err, { route: '/api/generate/from-facts' });
    const msg = err instanceof Error ? err.message : 'Unknown';
    return Response.json({ success: false, error: msg.slice(0, 200), code: 'GENERATION_FAILED' }, { status: 500 });
  }
}
