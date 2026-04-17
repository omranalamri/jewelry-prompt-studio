import { NextRequest } from 'next/server';
import Replicate from 'replicate';
import { IMAGE_MODELS, formatCost } from '@/lib/creative/model-registry';
import { logCost } from '@/lib/cost-tracker';
import { getDb } from '@/lib/db';
import { trackGeneration } from '@/lib/learning/generation-tracker';
import { validatePrompt } from '@/lib/jewelry/validation';

export const maxDuration = 300;

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, referenceImageUrl, count = 4, aspectRatio = '1:1' } = await req.json();

    if (!prompt) return errorResponse('MISSING_PROMPT', 'No prompt provided.', 400);
    if (!process.env.REPLICATE_API_TOKEN) return errorResponse('NOT_CONFIGURED', 'Not configured.', 503);

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
    let cleanPrompt = prompt.replace(/--ar\s+\S+/g, '').replace(/--style\s+\S+/g, '')
      .replace(/--v\s+\S+/g, '').replace(/--q\s+\S+/g, '').replace(/--no\s+.*/g, '').trim();

    // Anti-hallucination validation
    const validation = validatePrompt(cleanPrompt);
    if (validation.correctionCount > 0) cleanPrompt = validation.correctedPrompt;

    const arMatch = prompt.match(/--ar\s+(\d+:\d+)/);
    const ar = arMatch ? arMatch[1] : aspectRatio;

    // Generate variations across multiple models for comparison
    const modelsToUse = IMAGE_MODELS.slice(0, Math.min(count, IMAGE_MODELS.length));
    const startTime = Date.now();

    const results = await Promise.allSettled(
      modelsToUse.map(async (modelInfo) => {
        try {
          let resultUrl: string;

          if (modelInfo.id === 'recraft-v3' && process.env.RECRAFT_API_TOKEN) {
            const response = await fetch('https://external.api.recraft.ai/v1/images/generations', {
              method: 'POST',
              headers: { 'Authorization': `Bearer ${process.env.RECRAFT_API_TOKEN}`, 'Content-Type': 'application/json' },
              body: JSON.stringify({ prompt: cleanPrompt, style: 'realistic_image', size: ar === '1:1' ? '1024x1024' : '1365x1024' }),
            });
            const data = await response.json();
            resultUrl = data.data?.[0]?.url;
            if (!resultUrl) throw new Error('No image');
          } else {
            const output = await replicate.run(modelInfo.replicateId as `${string}/${string}`, {
              input: {
                prompt: referenceImageUrl
                  ? `Transform this jewelry photo, keep exact piece unchanged: ${cleanPrompt}`
                  : cleanPrompt,
                resolution: modelInfo.id === 'nano-banana-pro' ? '2K' : '1K',
                aspect_ratio: ar, output_format: 'jpg',
                ...(modelInfo.id === 'nano-banana-pro' && { safety_filter_level: 'block_only_high' }),
                ...(referenceImageUrl && { image_input: [referenceImageUrl] }),
              },
            });
            resultUrl = Array.isArray(output) ? String(output[0]) : String(output);
          }

          logCost({ model: modelInfo.name, type: 'image', cost: modelInfo.costEstimate, promptPreview: cleanPrompt, resultUrl });
          trackGeneration({ promptText: cleanPrompt, generationModel: modelInfo.id, generationType: 'image', referenceImageUrl, resultUrl, cost: modelInfo.costEstimate });

          // Auto-save with lineage
          try {
            const sql = getDb();
            await sql`INSERT INTO repository (category, title, description, image_url, tags, metadata, prompt_text, model_used, reference_url)
              VALUES ('generated', ${'Batch — ' + modelInfo.name}, ${cleanPrompt.slice(0, 200)}, ${resultUrl}, ${['batch', modelInfo.id]}, '{}', ${cleanPrompt}, ${modelInfo.name}, ${referenceImageUrl || null})`;
          } catch { /* */ }

          return { model: modelInfo.name, modelId: modelInfo.id, resultUrl, cost: modelInfo.costEstimate, quality: modelInfo.quality };
        } catch (e) {
          return { model: modelInfo.name, modelId: modelInfo.id, error: e instanceof Error ? e.message.slice(0, 80) : 'Failed' };
        }
      })
    );

    const elapsed = (Date.now() - startTime) / 1000;
    const successful = results
      .filter((r): r is PromiseFulfilledResult<{ model: string; modelId: string; resultUrl: string; cost: number; quality: number }> =>
        r.status === 'fulfilled' && 'resultUrl' in r.value)
      .map(r => r.value);

    const totalCost = successful.reduce((sum, r) => sum + r.cost, 0);

    return Response.json({
      success: true,
      data: {
        results: successful,
        totalCost: formatCost(totalCost),
        totalCostRaw: totalCost,
        count: successful.length,
        timeSeconds: parseFloat(elapsed.toFixed(1)),
      },
    });
  } catch (error) {
    console.error('Batch error:', error);
    return errorResponse('BATCH_FAILED', 'Batch generation failed.', 500);
  }
}
