import { NextRequest } from 'next/server';
import { put } from '@vercel/blob';
import { getDb } from '@/lib/db';
import { logCost } from '@/lib/cost-tracker';
import { validatePromptWithLearned as validatePrompt } from '@/lib/jewelry/validation';
import { generateImage, formatCostGoogle, isGeminiConfigured } from '@/lib/gemini';

export const maxDuration = 300; // 5 min — batch generation

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

// Scene systems per jewelry type — body placement + camera angles + design styles
interface Scene { id: string; name: string; angle: string; prompt: string; }

const SCENES_RING: Scene[] = [
  { id: 'hand-front', name: 'Hand Front', angle: 'Hand', prompt: 'Ring on elegant hand, ring finger, camera 30° above, hand naturally curved resting on dark surface, key light at 45° for gemstone fire' },
  { id: 'hand-close', name: 'Hand Closeup', angle: 'Macro', prompt: 'Extreme macro closeup of ring on finger, shallow depth of field, every diamond facet catching light, skin detail visible' },
  { id: 'hand-side', name: 'Hand Side', angle: 'Side', prompt: 'Ring on hand viewed from the side, showing band profile and stone height, elegant hand pose, rim lighting on metal' },
  { id: 'hand-cup', name: 'Holding Cup', angle: 'Lifestyle', prompt: 'Elegant hand wearing ring holding champagne glass, lifestyle shot, warm ambient lighting, luxury setting, ring catching light' },
  { id: 'hand-both', name: 'Both Hands', angle: 'Detail', prompt: 'Both hands visible, ring prominent on ring finger, hands gently clasped, soft studio lighting, intimate and romantic' },
  { id: 'flat-lay', name: 'Flat Lay', angle: 'Top', prompt: 'Ring flat on velvet surface shot from directly above, showing full circular shape and stone, dramatic spotlight' },
  { id: 'box-reveal', name: 'Box Reveal', angle: 'Scene', prompt: 'Ring in open jewelry box, dramatic reveal moment, box on dark surface, spotlight on ring, shallow depth of field' },
  { id: 'hero-ring', name: 'Hero Shot', angle: 'Hero', prompt: 'Hero advertising shot, ring floating at slight angle, dramatic rim lighting, magazine cover quality, bold and striking' },
  { id: 'ring-detail', name: 'Band Detail', angle: 'Macro', prompt: 'Closeup of ring band showing metalwork detail, engraving, hallmarks, texture of polished gold, soft macro lighting' },
];

const SCENES_NECKLACE: Scene[] = [
  { id: 'neck-front', name: 'Neck Front', angle: 'Front', prompt: 'Necklace on elegant neck and collarbone, frontal view, pendant at natural hanging point on sternum, even lighting' },
  { id: 'neck-side', name: 'Neck Profile', angle: '45°', prompt: 'Necklace on neck, three-quarter profile view, chain draping along collarbone, pendant visible, side light for sparkle' },
  { id: 'neck-close', name: 'Pendant Close', angle: 'Macro', prompt: 'Extreme closeup of pendant/centerpiece of necklace against skin, every detail visible, shallow depth of field' },
  { id: 'neck-back', name: 'Back Clasp', angle: 'Back', prompt: 'View from behind showing necklace clasp on back of neck, hair swept aside, elegant pose, soft lighting' },
  { id: 'decollete', name: 'Decollete', angle: 'Scene', prompt: 'Necklace on decollete area, slightly above eye level, chain following natural neckline, warm skin tones, intimate lighting' },
  { id: 'necklace-dress', name: 'With Dress', angle: 'Lifestyle', prompt: 'Necklace on model wearing elegant evening dress, lifestyle shot, chandelier ambient light, aspirational luxury' },
  { id: 'necklace-flat', name: 'Flat Display', angle: 'Top', prompt: 'Necklace laid flat on dark velvet in elegant curve, shot from above, full chain visible, dramatic spotlight' },
  { id: 'hero-necklace', name: 'Hero Shot', angle: 'Hero', prompt: 'Hero advertising shot, necklace draped dramatically, bold lighting with golden rim light, magazine cover quality' },
  { id: 'chain-detail', name: 'Chain Detail', angle: 'Macro', prompt: 'Macro of chain links showing craftsmanship, individual links visible, metal texture, soft studio macro lighting' },
];

const SCENES_BRACELET: Scene[] = [
  { id: 'wrist-front', name: 'Wrist Front', angle: 'Front', prompt: 'Bracelet on wrist, front view, wrist at natural angle, bracelet at wrist crease, balanced studio lighting' },
  { id: 'wrist-side', name: 'Wrist Side', angle: 'Side', prompt: 'Bracelet on wrist from side angle, showing how it drapes, clasp visible, elegant hand gesture' },
  { id: 'wrist-cup', name: 'With Coffee', angle: 'Lifestyle', prompt: 'Elegant wrist wearing bracelet holding coffee cup, lifestyle morning scene, warm natural window light' },
  { id: 'wrist-desk', name: 'At Desk', angle: 'Scene', prompt: 'Hand resting on desk surface, bracelet catching light, professional lifestyle context, warm ambient lighting' },
  { id: 'bracelet-close', name: 'Clasp Detail', angle: 'Macro', prompt: 'Macro closeup of bracelet clasp and links, showing metalwork quality, shallow depth of field' },
  { id: 'bracelet-flat', name: 'Flat Display', angle: 'Top', prompt: 'Bracelet laid in circular shape on velvet, shot from above, full design visible, dramatic single spotlight' },
  { id: 'bracelet-stack', name: 'Stack Look', angle: 'Style', prompt: 'Multiple bracelets stacked on wrist, showing how piece works in combination, editorial styling, fashion forward' },
  { id: 'hero-bracelet', name: 'Hero Shot', angle: 'Hero', prompt: 'Hero advertising shot, bracelet floating with dramatic rim light, bold composition, luxury advertising quality' },
  { id: 'bracelet-detail', name: 'Link Detail', angle: 'Macro', prompt: 'Extreme macro of bracelet links, gemstone settings visible, metal texture, craftsmanship detail, studio macro' },
];

const SCENES_EARRINGS: Scene[] = [
  { id: 'ear-profile', name: 'Ear Profile', angle: '90°', prompt: 'Earring on ear, full side profile, hair swept back, drop earring hanging naturally, side light for maximum sparkle' },
  { id: 'ear-three-quarter', name: 'Three-Quarter', angle: '45°', prompt: 'Earrings visible at three-quarter angle, both earrings showing, elegant model pose, studio lighting' },
  { id: 'ear-close', name: 'Earring Close', angle: 'Macro', prompt: 'Extreme closeup of single earring on ear, every detail visible, earlobe and earring in sharp focus, macro lighting' },
  { id: 'ear-pair', name: 'Both Ears', angle: 'Front', prompt: 'Front-facing portrait showing both earrings, symmetrical composition, model looking at camera, balanced lighting' },
  { id: 'ear-lifestyle', name: 'Lifestyle', angle: 'Scene', prompt: 'Model wearing earrings in lifestyle setting, candid elegant moment, hair movement, warm natural lighting' },
  { id: 'ear-hair-up', name: 'Hair Up', angle: 'Scene', prompt: 'Earrings with hair in updo, full earring length visible from lobe to end, elegant neck line, formal styling' },
  { id: 'earring-flat', name: 'Flat Display', angle: 'Top', prompt: 'Pair of earrings on dark velvet surface, shot from above, symmetrical placement, dramatic spotlight' },
  { id: 'hero-earrings', name: 'Hero Shot', angle: 'Hero', prompt: 'Hero shot, earring catching dramatic light, bold composition, sparkle and movement, magazine cover quality' },
  { id: 'earring-detail', name: 'Setting Detail', angle: 'Macro', prompt: 'Macro of earring setting, post/clip mechanism, stone settings, metalwork quality, studio macro lighting' },
];

const SCENES_PENDANT: Scene[] = [
  { id: 'pendant-chest', name: 'On Chest', angle: 'Front', prompt: 'Pendant resting on chest, frontal view, chain visible on collarbones, pendant at natural hanging point' },
  { id: 'pendant-close', name: 'Pendant Close', angle: 'Macro', prompt: 'Extreme closeup of pendant design, every detail visible, chain blur in background, macro studio lighting' },
  { id: 'pendant-side', name: 'Side Angle', angle: '30°', prompt: 'Pendant on neck from side angle, showing how it hangs, light catching the pendant face, profile of model' },
  { id: 'pendant-hands', name: 'Holding Pendant', angle: 'Detail', prompt: 'Fingers delicately holding pendant while wearing it, intimate detail shot, soft lighting, personal moment' },
  { id: 'pendant-lifestyle', name: 'Lifestyle', angle: 'Scene', prompt: 'Model wearing pendant in lifestyle setting, casual elegance, warm natural light, aspirational and approachable' },
  { id: 'pendant-flat', name: 'Flat Display', angle: 'Top', prompt: 'Pendant on chain laid on dark velvet, artistic arrangement, shot from above, dramatic spotlight on pendant' },
  { id: 'hero-pendant', name: 'Hero Shot', angle: 'Hero', prompt: 'Hero advertising shot, pendant dramatic and bold, rim light catching every edge, luxury magazine quality' },
  { id: 'pendant-back', name: 'Back Detail', angle: 'Back', prompt: 'Back of pendant showing hallmark, chain connection, craftsmanship detail, macro documentation style' },
  { id: 'pendant-layer', name: 'Layered Look', angle: 'Style', prompt: 'Pendant layered with other necklaces, showing how it works in combination, editorial fashion styling' },
];

// Generic fallback for brooch, watch, etc.
const SCENES_GENERIC: Scene[] = [
  { id: 'gen-front', name: 'Front View', angle: '0°', prompt: 'Direct frontal view, symmetrical composition, full jewelry display centered, even lighting' },
  { id: 'gen-quarter-r', name: 'Three-Quarter Right', angle: '30°R', prompt: '30-degree right turn, showing depth and dimension of the metalwork' },
  { id: 'gen-quarter-l', name: 'Three-Quarter Left', angle: '30°L', prompt: '30-degree left turn, revealing opposite side details' },
  { id: 'gen-profile', name: 'Side Profile', angle: '45°R', prompt: '45-degree right angle, strong profile view, side silhouette, clasp and side details' },
  { id: 'gen-macro', name: 'Macro Detail', angle: 'Macro', prompt: 'Extreme closeup macro, shallow depth of field, intricate detail — gemstone facets, filigree, settings' },
  { id: 'gen-top', name: 'Top-Down', angle: 'Down', prompt: 'Shot from above, showing full spread and design, dramatic spotlight on dark surface' },
  { id: 'gen-lifestyle', name: 'Lifestyle', angle: 'Scene', prompt: 'Lifestyle context, worn or displayed in elegant setting, warm natural lighting, aspirational' },
  { id: 'gen-hero', name: 'Hero Shot', angle: 'Hero', prompt: 'Hero advertising shot, dramatic rim lighting, magazine cover quality, bold and striking' },
  { id: 'gen-detail', name: 'Craft Detail', angle: 'Macro', prompt: 'Closeup showing craftsmanship, metalwork quality, hallmarks, texture detail, studio macro' },
];

function getScenesForType(jewelryType: string): Scene[] {
  switch (jewelryType) {
    case 'ring': return SCENES_RING;
    case 'necklace': return SCENES_NECKLACE;
    case 'bracelet': return SCENES_BRACELET;
    case 'earrings': return SCENES_EARRINGS;
    case 'pendant': return SCENES_PENDANT;
    default: return SCENES_GENERIC;
  }
}

export async function POST(req: NextRequest) {
  try {
    const {
      productImageUrl,       // Customer's jewelry piece
      inspirationImageUrl,   // Optional style reference
      modelImageUrl,         // Optional human model to wear the jewelry
      jewelryType,           // ring, necklace, bracelet, earrings, brooch
      setting,               // studio, lifestyle, editorial, dramatic
      customPrompt,          // Optional additional creative direction
      selectedAngles,        // Optional: array of angle IDs to generate (default: all 9)
    } = await req.json();

    if (!productImageUrl) return errorResponse('MISSING_IMAGE', 'Upload a product image.', 400);
    if (!isGeminiConfigured()) return errorResponse('NOT_CONFIGURED', 'Google AI API key not set.', 503);

    // Build base prompt from jewelry type and setting
    const settingPrompts: Record<string, string> = {
      studio: 'Professional studio jewelry photography, black velvet display surface, controlled lighting',
      lifestyle: 'Lifestyle jewelry photography, worn on elegant model, warm natural lighting, aspirational',
      editorial: 'High-end editorial jewelry photography, minimalist composition, white marble surface, soft window light',
      dramatic: 'Dramatic jewelry advertising photography, bold contrast, rim lighting, polished black surface',
    };

    const basePrompt = [
      settingPrompts[setting] || settingPrompts.studio,
      modelImageUrl ? `The model from the reference photo wearing the ${jewelryType || 'jewelry'}` : '',
      customPrompt ? validatePrompt(customPrompt).correctedPrompt : '',
      `Maintain exact ${jewelryType || 'jewelry'} design, metal color, gemstones, and proportions from the product reference image`,
    ].filter(Boolean).join('. ');

    // Select which angles to generate
    const angles = selectedAngles?.length
      ? getScenesForType(jewelryType || 'ring').filter(a => selectedAngles.includes(a.id))
      : getScenesForType(jewelryType || 'ring');

    // Build image_input array: product first, then model, then inspiration
    const imageInputs = [productImageUrl];
    if (modelImageUrl) imageInputs.push(modelImageUrl);
    if (inspirationImageUrl) imageInputs.push(inspirationImageUrl);

    const startTime = Date.now();
    let totalCost = 0;

    // Generate in parallel batches of 3 (avoid rate limits)
    const results: {
      id: string;
      name: string;
      angle: string;
      prompt: string;
      resultUrl: string | null;
      error: string | null;
      timeSeconds: number;
      cost: number;
    }[] = [];

    for (let i = 0; i < angles.length; i += 3) {
      const batch = angles.slice(i, i + 3);

      const batchResults = await Promise.allSettled(
        batch.map(async (angle) => {
          const fullPrompt = `${basePrompt}. ${angle.prompt}.`;
          const genStart = Date.now();

          // Google Gemini direct — latest model
          const result = await generateImage(fullPrompt, imageInputs);
          const buf = Buffer.from(result.imageBase64, 'base64');
          const ext = result.mimeType.includes('png') ? 'png' : 'jpg';
          const blob = await put(`campaign/${crypto.randomUUID()}.${ext}`, buf, {
            access: 'public', contentType: result.mimeType,
          });

          const elapsed = (Date.now() - genStart) / 1000;

          return {
            id: angle.id,
            name: angle.name,
            angle: angle.angle,
            prompt: fullPrompt,
            resultUrl: blob.url,
            error: null,
            timeSeconds: parseFloat(elapsed.toFixed(1)),
            cost: result.cost,
          };
        })
      );

      for (const r of batchResults) {
        if (r.status === 'fulfilled') {
          results.push(r.value);
          totalCost += r.value.cost;
        } else {
          const failedAngle = batch[batchResults.indexOf(r)];
          results.push({
            id: failedAngle.id,
            name: failedAngle.name,
            angle: failedAngle.angle,
            prompt: '',
            resultUrl: null,
            error: r.reason?.message?.slice(0, 80) || 'Generation failed',
            timeSeconds: 0,
            cost: 0,
          });
        }
      }
    }

    const totalTime = (Date.now() - startTime) / 1000;
    const successCount = results.filter(r => r.resultUrl).length;

    // Save campaign to database
    try {
      const sql = getDb();
      await sql`INSERT INTO repository (category, title, description, image_url, tags, prompt_text, model_used, reference_url, pipeline_steps)
        VALUES ('campaign', ${`Campaign — ${jewelryType || 'jewelry'} — ${new Date().toLocaleDateString()}`}, ${`${successCount} angles generated in ${setting || 'studio'} setting`}, ${results.find(r => r.resultUrl)?.resultUrl || ''}, ${['campaign', jewelryType || 'jewelry', setting || 'studio']}, ${basePrompt.slice(0, 300)}, ${'Nano Banana 2 (batch)'}, ${productImageUrl}, ${JSON.stringify(results)})`;
    } catch { /* */ }

    logCost({ model: 'NB2 Campaign Batch', type: 'image', cost: totalCost, durationSeconds: totalTime, promptPreview: `Campaign: ${successCount} angles`, resultUrl: results[0]?.resultUrl || '' });

    return Response.json({
      success: true,
      data: {
        campaignId: crypto.randomUUID(),
        productImageUrl,
        inspirationImageUrl: inspirationImageUrl || null,
        setting: setting || 'studio',
        jewelryType: jewelryType || 'jewelry',
        totalAngles: angles.length,
        successCount,
        failCount: angles.length - successCount,
        totalCost: formatCostGoogle(totalCost),
        totalCostRaw: totalCost,
        totalTimeSeconds: parseFloat(totalTime.toFixed(1)),
        angles: results,
      },
    });
  } catch (error) {
    console.error('Campaign generation error:', error);
    return errorResponse('CAMPAIGN_FAILED', 'Campaign generation failed.', 500);
  }
}
