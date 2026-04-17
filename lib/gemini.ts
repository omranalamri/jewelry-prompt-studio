// Google AI — Gemini only. No Imagen. No fallback tiers.
// SINGLE model strategy to eliminate cross-model hallucination.
// Primary image: Gemini 3 Pro Image (best design preservation for jewelry)
// Primary video: Veo 3.1 standard (cinematic, 1080p, proper sparkle physics)

const API_KEY = () => process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
const BASE = 'https://generativelanguage.googleapis.com/v1beta';

// ============================================
// PRICING (per generation, April 2026)
// ============================================
export const PRICING = {
  // Images — Gemini only
  'gemini-3-pro-image-preview':     { cost: 0.05, label: 'Gemini 3 Pro Image', tier: 'primary' },
  'gemini-3.1-flash-image-preview': { cost: 0.02, label: 'Gemini 3.1 Flash Image', tier: 'draft-only' },
  'gemini-2.5-flash-image':         { cost: 0.03, label: 'Gemini 2.5 Flash Image', tier: 'legacy' },
  // Videos — Veo only
  'veo-3.1-generate-preview':       { cost: 0.50, label: 'Veo 3.1', tier: 'primary', perSecond: true },
  'veo-3.1-fast-generate-preview':  { cost: 0.35, label: 'Veo 3.1 Fast', tier: 'draft-only', perSecond: true },
  'veo-3.1-lite-generate-preview':  { cost: 0.15, label: 'Veo 3.1 Lite', tier: 'draft-only', perSecond: true },
  'veo-2.0-generate-001':           { cost: 0.15, label: 'Veo 2.0', tier: 'legacy', perSecond: true },
  // BG removal (only Replicate service allowed)
  'birefnet':                        { cost: 0.003, label: 'BiRefNet (Replicate)', tier: 'infrastructure' },
} as const;

// DEFAULTS — best-in-class only. No fallbacks between models.
const DEFAULT_IMAGE_MODEL = 'gemini-3-pro-image-preview';
const DEFAULT_VIDEO_MODEL = 'veo-3.1-generate-preview';

// ============================================
// IMAGE GENERATION (Gemini 3 Pro — no fallback)
// ============================================
async function urlToBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return null;
    const buf = Buffer.from(await resp.arrayBuffer());
    return { data: buf.toString('base64'), mimeType: resp.headers.get('content-type') || 'image/jpeg' };
  } catch { return null; }
}

export async function generateImage(
  prompt: string,
  referenceImageUrls?: string[],
  modelId?: string,
): Promise<{ imageBase64: string; mimeType: string; text?: string; model: string; cost: number }> {
  const key = API_KEY();
  if (!key) throw new Error('GOOGLE_AI_API_KEY not set');

  const model = modelId || DEFAULT_IMAGE_MODEL;
  const pricing = PRICING[model as keyof typeof PRICING];
  const cost = pricing?.cost || 0.05;

  // Build parts
  const parts: Record<string, unknown>[] = [{ text: prompt }];
  if (referenceImageUrls?.length) {
    for (const url of referenceImageUrls) {
      if (!url) continue;
      const img = await urlToBase64(url);
      if (img) parts.push({ inlineData: { mimeType: img.mimeType, data: img.data } });
    }
  }

  const resp = await fetch(`${BASE}/models/${model}:generateContent?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    const msg = (err as { error?: { message?: string } }).error?.message || `Gemini ${resp.status}`;
    // NO FALLBACK — fail loudly so caller can retry
    throw new Error(msg);
  }

  const data = await resp.json();
  const candidateParts = data.candidates?.[0]?.content?.parts;
  if (!candidateParts) throw new Error('No response from Gemini');

  let imageBase64 = '';
  let mimeType = 'image/png';
  let text = '';

  for (const part of candidateParts) {
    if (part.inlineData) { imageBase64 = part.inlineData.data; mimeType = part.inlineData.mimeType || 'image/png'; }
    if (part.text) text = part.text;
  }

  if (!imageBase64) throw new Error('Gemini returned no image');
  return { imageBase64, mimeType, text, model, cost };
}

// ============================================
// VIDEO GENERATION (Veo 3.1 — no fallback)
// ============================================
export async function generateVideo(
  prompt: string,
  imageUrl?: string,
  modelId?: string,
  durationSeconds = 8,
): Promise<{ videoUrl: string; model: string; cost: number; durationSeconds: number }> {
  const key = API_KEY();
  if (!key) throw new Error('GOOGLE_AI_API_KEY not set');

  const model = modelId || DEFAULT_VIDEO_MODEL;
  const pricing = PRICING[model as keyof typeof PRICING];
  const perSecondCost = pricing?.cost || 0.50;
  const cost = perSecondCost * durationSeconds;

  const instance: Record<string, unknown> = { prompt };
  if (imageUrl) {
    const img = await urlToBase64(imageUrl);
    if (img) instance.image = { bytesBase64Encoded: img.data, mimeType: img.mimeType };
  }

  const resp = await fetch(`${BASE}/models/${model}:predictLongRunning?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      instances: [instance],
      parameters: { aspectRatio: '16:9', sampleCount: 1, durationSeconds },
    }),
  });

  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    const msg = (err as { error?: { message?: string } }).error?.message || `Veo ${resp.status}`;
    // NO FALLBACK — fail loudly
    throw new Error(msg);
  }

  const opData = await resp.json();
  const operationName = opData.name;
  if (!operationName) throw new Error('Veo did not return an operation');

  // Poll for completion (up to 3 min)
  for (let i = 0; i < 18; i++) {
    await new Promise(r => setTimeout(r, 10000));

    const pollResp = await fetch(`${BASE}/${operationName}?key=${key}`);
    const pollData = await pollResp.json();

    if (pollData.done) {
      const samples = pollData.response?.generateVideoResponse?.generatedSamples;
      if (samples?.[0]?.video?.uri) {
        const videoUri = `${samples[0].video.uri}?key=${key}`;
        return { videoUrl: videoUri, model, cost, durationSeconds };
      }
      throw new Error('Veo completed but no video returned');
    }
  }

  throw new Error('Veo timed out after 3 minutes');
}

export function isGeminiConfigured(): boolean {
  return !!API_KEY();
}

export function formatCostGoogle(cost: number): string {
  if (cost < 0.01) return '<$0.01';
  return `$${cost.toFixed(2)}`;
}
