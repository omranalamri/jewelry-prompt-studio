import { NextRequest } from 'next/server';
import Replicate from 'replicate';
import { IMAGE_MODELS, getImageModel, getBestImageModel, formatCost } from '@/lib/creative/model-registry';
import { getDb } from '@/lib/db';
import { logCost } from '@/lib/cost-tracker';
import { trackGeneration } from '@/lib/learning/generation-tracker';
import { validatePromptWithLearned as validatePrompt } from '@/lib/jewelry/validation';
import { rehostForReplicate } from '@/lib/rehost-image';

export const maxDuration = 120;

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, platform, aspectRatio, model: requestedModelId, referenceImageUrl } = await req.json();

    if (!prompt) return errorResponse('MISSING_PROMPT', 'No prompt provided.', 400);
    if (!process.env.REPLICATE_API_TOKEN) return errorResponse('NOT_CONFIGURED', 'Not configured.', 503);

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    // Clean and validate prompt
    let cleanPrompt = prompt
      .replace(/--ar\s+\S+/g, '').replace(/--style\s+\S+/g, '')
      .replace(/--v\s+\S+/g, '').replace(/--q\s+\S+/g, '')
      .replace(/--no\s+.*/g, '').trim();

    const validation = validatePrompt(cleanPrompt);
    if (validation.correctionCount > 0) cleanPrompt = validation.correctedPrompt;

    const arMatch = prompt.match(/--ar\s+(\d+:\d+)/);
    const ar = arMatch ? arMatch[1] : (aspectRatio || '1:1');

    // Re-host reference image so Replicate can access it
    // Blob URLs return 403 — rehost returns undefined in that case
    let rehostedRef: string | undefined;
    if (referenceImageUrl) rehostedRef = await rehostForReplicate(referenceImageUrl);

    // Select model — only NB2 or NB Pro
    const modelInfo = requestedModelId ? (getImageModel(requestedModelId) || getBestImageModel()) : getBestImageModel();

    // Build the prompt for Nano Banana
    const hasRef = !!rehostedRef;
    const finalPrompt = hasRef
      ? `Transform this jewelry photo: STRICTLY maintain the exact original jewelry design, proportions, stone arrangement, and metal details. Do not modify, add, or embellish the original design. Only change the styling: ${cleanPrompt}`
      : cleanPrompt;

    // Generate — NO fallback. If it fails, fail honestly.
    const startTime = Date.now();

    try {
      const output = await replicate.run(modelInfo.replicateId as `${string}/${string}`, {
        input: {
          prompt: finalPrompt,
          resolution: modelInfo.id === 'nano-banana-pro' ? '2K' : '1K',
          aspect_ratio: ar,
          output_format: 'jpg',
          ...(modelInfo.id === 'nano-banana-pro' && { safety_filter_level: 'block_only_high' }),
          ...(hasRef && { image_input: [rehostedRef] }),
        },
      });

      const resultUrl = Array.isArray(output) ? String(output[0]) : String(output);
      const elapsed = (Date.now() - startTime) / 1000;

      // Track everything
      try {
        const sql = getDb();
        await sql`INSERT INTO repository (category, title, description, image_url, tags, metadata, prompt_text, model_used, reference_url)
          VALUES ('generated', ${modelInfo.name + ' — ' + new Date().toLocaleDateString()}, ${cleanPrompt.slice(0, 300)}, ${resultUrl}, ${[platform || 'image', modelInfo.id]}, ${JSON.stringify({ model: modelInfo.name, cost: modelInfo.costEstimate, time: elapsed })}, ${cleanPrompt}, ${modelInfo.name}, ${referenceImageUrl || null})`;
      } catch { /* */ }
      logCost({ model: modelInfo.name, type: 'image', cost: modelInfo.costEstimate, durationSeconds: elapsed, promptPreview: cleanPrompt, resultUrl });
      const genId = await trackGeneration({
        promptText: cleanPrompt, generationModel: modelInfo.id, generationType: 'image',
        aspectRatio: ar, wasFirstChoice: true,
        referenceImageUrl, resultUrl, cost: modelInfo.costEstimate, durationSeconds: elapsed,
      });

      return Response.json({
        success: true,
        data: {
          id: genId || crypto.randomUUID(),
          provider: modelInfo.id,
          model: modelInfo.name,
          modelId: modelInfo.id,
          status: 'completed',
          resultUrl,
          cost: formatCost(modelInfo.costEstimate),
          costRaw: modelInfo.costEstimate,
          timeSeconds: parseFloat(elapsed.toFixed(1)),
          resolution: modelInfo.resolution,
          quality: modelInfo.quality,
          hadReference: hasRef,
          validation: validation.correctionCount > 0 ? { corrected: validation.correctionCount, issues: validation.issues.map(i => i.issue) } : null,
        },
      });
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Unknown error';
      // Check if it's a capacity issue
      if (errorMsg.includes('unavailable') || errorMsg.includes('E003') || errorMsg.includes('high demand')) {
        return errorResponse('MODEL_BUSY', `${modelInfo.name} is currently at capacity. Please try again in a few minutes.`, 503);
      }
      console.error(`${modelInfo.name} failed:`, errorMsg.slice(0, 100));
      return errorResponse('GENERATION_FAILED', `${modelInfo.name} failed: ${errorMsg.slice(0, 80)}. Try again shortly.`, 500);
    }
  } catch (error) {
    console.error('Image generation error:', error);
    return errorResponse('GENERATION_FAILED', 'Image generation failed.', 500);
  }
}
