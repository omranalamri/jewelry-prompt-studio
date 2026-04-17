import { NextRequest } from 'next/server';
import { put } from '@vercel/blob';
import { getDb } from '@/lib/db';
import { logCost } from '@/lib/cost-tracker';
import { trackGeneration } from '@/lib/learning/generation-tracker';
import { validatePromptWithLearned as validatePrompt } from '@/lib/jewelry/validation';
import { saveToBlob } from '@/lib/blob-storage';
import { generateImage as geminiGenerateImage, isGeminiConfigured, formatCostGoogle } from '@/lib/gemini';
import { getImageGenRateLimiter, checkRateLimit } from '@/lib/redis/client';

export const maxDuration = 300;

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

// Save Gemini base64 → Blob
async function saveGeminiToBlob(imageBase64: string, mimeType: string, prefix = 'generated'): Promise<string> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return '';
  const buf = Buffer.from(imageBase64, 'base64');
  const ext = mimeType.includes('png') ? 'png' : 'jpg';
  const blob = await put(`${prefix}/${crypto.randomUUID()}.${ext}`, buf, { access: 'public', contentType: mimeType });
  return blob.url;
}

interface PipelineStep { step: string; label: string; url: string; time: string; model?: string; cost?: string; }

export async function POST(req: NextRequest) {
  try {
    // Rate limit — 50 images/min per IP (if Redis configured)
    const limiter = getImageGenRateLimiter();
    if (limiter) {
      const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'anonymous';
      const rl = await checkRateLimit(limiter, ip.split(',')[0].trim());
      if (rl && !rl.success) {
        return Response.json(
          { success: false, error: `Rate limit exceeded. ${rl.remaining}/${rl.limit} remaining. Retry in ${Math.ceil((rl.reset - Date.now()) / 1000)}s`, code: 'RATE_LIMIT' },
          { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.reset - Date.now()) / 1000)) } }
        );
      }
    }

    const {
      prompt, platform, aspectRatio,
      referenceImageUrl, inspirationImageUrl,
    } = await req.json();

    if (!prompt) return errorResponse('MISSING_PROMPT', 'No prompt.', 400);
    if (!isGeminiConfigured()) return errorResponse('NOT_CONFIGURED', 'Gemini API key not configured.', 503);

    // Clean and validate prompt
    let cleanPrompt = prompt
      .replace(/--ar\s+\S+/g, '').replace(/--style\s+\S+/g, '')
      .replace(/--v\s+\S+/g, '').replace(/--q\s+\S+/g, '')
      .replace(/--no\s+.*/g, '').trim();
    const validation = validatePrompt(cleanPrompt);
    if (validation.correctionCount > 0) cleanPrompt = validation.correctedPrompt;

    const arMatch = prompt.match(/--ar\s+(\d+:\d+)/);
    const ar = arMatch ? arMatch[1] : (aspectRatio || '1:1');
    const startTime = Date.now();

    // Save inspiration to repository if provided
    if (inspirationImageUrl) {
      try {
        const sql = getDb();
        const permanentInspo = await saveToBlob(inspirationImageUrl, 'inspiration');
        await sql`INSERT INTO repository (category, title, description, image_url, tags)
          VALUES ('mood', ${`Inspiration — ${new Date().toLocaleDateString()}`}, ${cleanPrompt.slice(0, 200)}, ${permanentInspo}, ${['inspiration', 'mood', platform || 'image']})`;
      } catch { /* */ }
    }

    if (referenceImageUrl) {
      // ============================================
      // SINGLE DIRECT PIPELINE
      // Reference + Inspiration meshed together in Gemini 3 Pro
      // (Users should upload jewelry on a white/clean background)
      // ============================================
      const imageInputs = inspirationImageUrl
        ? [referenceImageUrl, inspirationImageUrl]
        : [referenceImageUrl];

      const pipelineSteps: PipelineStep[] = [
        { step: 'original', label: 'Customer\'s Piece', url: referenceImageUrl, time: '0s' },
      ];
      if (inspirationImageUrl) {
        pipelineSteps.push({ step: 'inspiration', label: 'Style Inspiration', url: inspirationImageUrl, time: '0s' });
      }

      let resultUrl: string;
      let modelName: string;
      let generationCost: number;
      try {
        const genStart = Date.now();
        const gem = await geminiGenerateImage(
          `${cleanPrompt}. Maintain exact jewelry design, metal color, and proportions from the reference image.`,
          imageInputs,
        );
        resultUrl = await saveGeminiToBlob(gem.imageBase64, gem.mimeType, 'generated');
        generationCost = gem.cost;
        modelName = `Gemini (${gem.model})`;
        const genTime = ((Date.now() - genStart) / 1000).toFixed(1);
        pipelineSteps.push({
          step: 'generate',
          label: `Generated (${gem.model})`,
          url: resultUrl,
          time: `${genTime}s`,
          model: gem.model,
          cost: `$${gem.cost.toFixed(3)}`,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown';
        return errorResponse('GENERATION_FAILED', msg.slice(0, 200), 500);
      }

      const elapsed = (Date.now() - startTime) / 1000;

      // Save to repository
      try {
        const sql = getDb();
        await sql`INSERT INTO repository (category, title, description, image_url, tags, prompt_text, model_used, reference_url, pipeline_steps)
          VALUES ('generated', ${`Generated — ${new Date().toLocaleDateString()}`}, ${cleanPrompt.slice(0, 300)}, ${resultUrl}, ${['generated', platform || 'image']}, ${cleanPrompt}, ${modelName}, ${referenceImageUrl}, ${JSON.stringify(pipelineSteps)})`;
      } catch { /* */ }

      logCost({ model: modelName, type: 'image', cost: generationCost, durationSeconds: elapsed, promptPreview: cleanPrompt, resultUrl });
      const genId = await trackGeneration({
        promptText: cleanPrompt,
        generationModel: 'gemini-direct',
        generationType: 'image',
        aspectRatio: ar,
        wasFirstChoice: true,
        referenceImageUrl,
        resultUrl,
        cost: generationCost,
        durationSeconds: elapsed,
      });

      return Response.json({
        success: true,
        data: {
          id: genId || crypto.randomUUID(),
          status: 'completed',
          resultUrl,
          model: modelName,
          modelId: 'gemini-direct',
          cost: formatCostGoogle(generationCost),
          costRaw: generationCost,
          timeSeconds: parseFloat(elapsed.toFixed(1)),
          hadReference: true,
          pipelineMode: 'direct',
          pipelineSteps,
          // Backwards-compat: keep direct/clean keys so existing UI code
          // reading data.direct?.resultUrl / data.clean?.resultUrl doesn't crash
          direct: {
            resultUrl,
            model: modelName,
            cost: formatCostGoogle(generationCost),
            costRaw: generationCost,
            timeSeconds: parseFloat(elapsed.toFixed(1)),
            pipelineSteps,
          },
          clean: null,
          cleanedImageUrl: null,
          validation: validation.correctionCount > 0
            ? { corrected: validation.correctionCount, issues: validation.issues.map(i => i.issue) }
            : null,
        },
      });

    } else {
      // ============================================
      // PROMPT ONLY: Single Gemini generation, no reference
      // ============================================
      const pipelineSteps: PipelineStep[] = [];
      let resultUrl: string;
      let modelName: string;
      let cost: number;

      try {
        const genStart = Date.now();
        const gem = await geminiGenerateImage(cleanPrompt);
        resultUrl = await saveGeminiToBlob(gem.imageBase64, gem.mimeType, 'generated');
        cost = gem.cost;
        modelName = `Gemini (${gem.model})`;
        const genTime = ((Date.now() - genStart) / 1000).toFixed(1);
        pipelineSteps.push({
          step: 'generate',
          label: `Generated (${modelName})`,
          url: resultUrl,
          time: `${genTime}s`,
          model: modelName,
          cost: formatCostGoogle(cost),
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown';
        return errorResponse('GENERATION_FAILED', `${msg.slice(0, 80)}`, 500);
      }

      const elapsed = (Date.now() - startTime) / 1000;

      try {
        const sql = getDb();
        await sql`INSERT INTO repository (category, title, description, image_url, tags, prompt_text, model_used, pipeline_steps)
          VALUES ('generated', ${`${modelName} — ${new Date().toLocaleDateString()}`}, ${cleanPrompt.slice(0, 300)}, ${resultUrl}, ${['generated', 'prompt-only', platform || 'image']}, ${cleanPrompt}, ${modelName}, ${JSON.stringify(pipelineSteps)})`;
      } catch { /* */ }

      logCost({ model: modelName, type: 'image', cost, durationSeconds: elapsed, promptPreview: cleanPrompt, resultUrl });
      const genId = await trackGeneration({
        promptText: cleanPrompt,
        generationModel: 'gemini-direct',
        generationType: 'image',
        aspectRatio: ar,
        wasFirstChoice: true,
        resultUrl,
        cost,
        durationSeconds: elapsed,
      });

      return Response.json({
        success: true,
        data: {
          id: genId || crypto.randomUUID(),
          provider: 'gemini-direct',
          model: modelName,
          modelId: 'gemini-direct',
          status: 'completed',
          resultUrl,
          cost: formatCostGoogle(cost),
          costRaw: cost,
          timeSeconds: parseFloat(elapsed.toFixed(1)),
          hadReference: false,
          pipelineMode: 'prompt-only',
          pipelineSteps,
          validation: validation.correctionCount > 0
            ? { corrected: validation.correctionCount, issues: validation.issues.map(i => i.issue) }
            : null,
        },
      });
    }
  } catch (error) {
    console.error('Image gen error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    return errorResponse('GENERATION_FAILED', `Failed: ${msg.slice(0, 200)}`, 500);
  }
}
