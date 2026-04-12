import { NextRequest } from 'next/server';
import Replicate from 'replicate';
import { getImageModel, getBestImageModel, formatCost } from '@/lib/creative/model-registry';
import { getDb } from '@/lib/db';
import { logCost } from '@/lib/cost-tracker';
import { trackGeneration } from '@/lib/learning/generation-tracker';
import { validatePromptWithLearned as validatePrompt } from '@/lib/jewelry/validation';

export const maxDuration = 120;

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, platform, aspectRatio, model: requestedModelId, referenceImageUrl } = await req.json();

    if (!prompt) return errorResponse('MISSING_PROMPT', 'No prompt.', 400);
    if (!process.env.REPLICATE_API_TOKEN) return errorResponse('NOT_CONFIGURED', 'Not configured.', 503);

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    // Clean and validate
    let cleanPrompt = prompt
      .replace(/--ar\s+\S+/g, '').replace(/--style\s+\S+/g, '')
      .replace(/--v\s+\S+/g, '').replace(/--q\s+\S+/g, '')
      .replace(/--no\s+.*/g, '').trim();

    const validation = validatePrompt(cleanPrompt);
    if (validation.correctionCount > 0) cleanPrompt = validation.correctedPrompt;

    const arMatch = prompt.match(/--ar\s+(\d+:\d+)/);
    const ar = arMatch ? arMatch[1] : (aspectRatio || '1:1');

    // Check if reference URL is Replicate-accessible
    const hasRef = !!referenceImageUrl && (
      referenceImageUrl.includes('replicate.com') ||
      referenceImageUrl.includes('replicate.delivery') ||
      referenceImageUrl.includes('caleums.com') // direct source URLs work
    );

    const startTime = Date.now();
    let resultUrl: string;
    let modelName: string;
    let modelId: string;
    let cost: number;

    if (hasRef) {
      // WITH REFERENCE: Use Flux Canny Pro for edge-guided generation
      // This preserves the EXACT shape/outline of the jewelry
      // Ranked #1 for jewelry fidelity by analysis
      try {
        const output = await replicate.run('black-forest-labs/flux-canny-pro', {
          input: {
            prompt: `Professional jewelry photography: ${cleanPrompt}. Maintain exact jewelry design from reference.`,
            control_image: referenceImageUrl,
            output_format: 'jpg',
            steps: 28,
            guidance: 30,
          },
        });
        resultUrl = typeof output === 'string' ? output : String(output);
        modelName = 'Flux Canny Pro';
        modelId = 'flux-canny';
        cost = 0.05;
      } catch {
        // Fallback: NB2 with image_input
        try {
          const output = await replicate.run('google/nano-banana-2', {
            input: {
              prompt: `Transform this jewelry photo: STRICTLY maintain the exact original design. ${cleanPrompt}`,
              image_input: [referenceImageUrl],
              resolution: '1K', aspect_ratio: ar, output_format: 'jpg',
            },
          });
          resultUrl = Array.isArray(output) ? String(output[0]) : String(output);
          modelName = 'Nano Banana 2';
          modelId = 'nano-banana-2';
          cost = 0.05;
        } catch (e2) {
          const msg = e2 instanceof Error ? e2.message : 'Unknown';
          return errorResponse('GENERATION_FAILED', `Generation failed: ${msg.slice(0, 80)}. Try again shortly.`, 500);
        }
      }
    } else {
      // WITHOUT REFERENCE: Use Nano Banana 2 for prompt-based generation
      // Scored 4.1/5 in self-review — best for prompt-only
      const modelInfo = requestedModelId ? (getImageModel(requestedModelId) || getBestImageModel()) : getBestImageModel();
      try {
        const output = await replicate.run(modelInfo.replicateId as `${string}/${string}`, {
          input: {
            prompt: cleanPrompt,
            resolution: modelInfo.id === 'nano-banana-pro' ? '2K' : '1K',
            aspect_ratio: ar, output_format: 'jpg',
            ...(modelInfo.id === 'nano-banana-pro' && { safety_filter_level: 'block_only_high' }),
          },
        });
        resultUrl = Array.isArray(output) ? String(output[0]) : String(output);
        modelName = modelInfo.name;
        modelId = modelInfo.id;
        cost = modelInfo.costEstimate;
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Unknown';
        if (msg.includes('unavailable') || msg.includes('E003')) {
          return errorResponse('MODEL_BUSY', `${modelInfo.name} at capacity. Try again shortly.`, 503);
        }
        return errorResponse('GENERATION_FAILED', `${modelInfo.name}: ${msg.slice(0, 80)}`, 500);
      }
    }

    const elapsed = (Date.now() - startTime) / 1000;

    // Track
    try {
      const sql = getDb();
      await sql`INSERT INTO repository (category, title, description, image_url, tags, prompt_text, model_used, reference_url)
        VALUES ('generated', ${modelName + ' — ' + new Date().toLocaleDateString()}, ${cleanPrompt.slice(0, 300)}, ${resultUrl}, ${[platform || 'image', modelId]}, ${cleanPrompt}, ${modelName}, ${referenceImageUrl || null})`;
    } catch { /* */ }
    logCost({ model: modelName, type: 'image', cost, durationSeconds: elapsed, promptPreview: cleanPrompt, resultUrl });
    const genId = await trackGeneration({
      promptText: cleanPrompt, generationModel: modelId, generationType: 'image',
      aspectRatio: ar, wasFirstChoice: true,
      referenceImageUrl, resultUrl, cost, durationSeconds: elapsed,
    });

    return Response.json({
      success: true,
      data: {
        id: genId || crypto.randomUUID(),
        provider: modelId, model: modelName, modelId, status: 'completed',
        resultUrl, cost: formatCost(cost), costRaw: cost,
        timeSeconds: parseFloat(elapsed.toFixed(1)),
        hadReference: hasRef,
        validation: validation.correctionCount > 0 ? { corrected: validation.correctionCount, issues: validation.issues.map(i => i.issue) } : null,
      },
    });
  } catch (error) {
    console.error('Image gen error:', error);
    return errorResponse('GENERATION_FAILED', 'Failed.', 500);
  }
}
