/**
 * Extract-Once Vision
 *
 * Analyze reference + inspiration images ONCE per session and return a
 * structured JSON of jewelry + visual facts. Downstream chat and synthesis
 * reuse this JSON instead of re-analyzing the images every turn.
 *
 * Economics: one Gemini 2.5 Pro Vision call (~$0.012) eliminates the per-turn
 * image-token overhead on chat and synthesis, which was ~$0.01 per turn on
 * Claude vision. Net savings: 4 chat turns × $0.01 − $0.012 = $0.028 per session.
 *
 * Quality win: synthesis gets higher-signal structured facts instead of
 * re-interpreting pixels on every call, which reduces drift between turns.
 */

import { logCost, estimateTokenCost } from '@/lib/cost-tracker';
import { assertSafeUrl, SsrfBlockedError } from '@/lib/auth/ssrf-guard';

const GEMINI_KEY = () => process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
const VISION_MODEL = 'gemini-2.5-pro';

export interface ExtractedJewelry {
  type: string | null;          // ring | necklace | earrings | bracelet | pendant | watch | set
  metal: string | null;         // 18k yellow gold | platinum | 18k rose gold | etc
  metalFinish: string | null;   // polished | brushed | hammered | matte
  stones: string | null;        // round brilliant diamond center + pavé halo
  setting: string | null;       // prong | bezel | halo | pavé | channel
  style: string | null;         // Art Deco | minimalist | Gulf heritage | etc
  distinguishingFeatures: string[]; // free text details worth preserving
}

export interface ExtractedInspiration {
  mood: string | null;
  lighting: string | null;
  palette: string[];
  composition: string | null;
  era: string | null;           // editorial era / aesthetic reference
}

export interface ExtractedFacts {
  jewelry: ExtractedJewelry;
  inspiration: ExtractedInspiration | null;
  confidence: 'high' | 'medium' | 'low';
  notes: string;                // free-form "anything else worth knowing" from the model
  extractedAt: string;          // ISO timestamp
  visionModel: string;
}

const EXTRACTION_PROMPT = `You are a precision jewelry visual analyzer. Examine the supplied image(s) and extract structured facts.

Respond with ONLY this JSON — no prose, no markdown fences:

{
  "jewelry": {
    "type": "ring | necklace | earrings | bracelet | pendant | watch | set | null",
    "metal": "e.g. 18k yellow gold | 950 platinum | 18k rose gold | silver | null",
    "metalFinish": "polished | brushed | hammered | matte | null",
    "stones": "e.g. 1.5ct round brilliant diamond center stone with pavé halo | null",
    "setting": "e.g. prong | bezel | halo | pavé | channel | null",
    "style": "e.g. Art Deco | minimalist | Gulf heritage Arabic calligraphy | classic solitaire | null",
    "distinguishingFeatures": ["bullet-point details worth preserving in generation prompts"]
  },
  "inspiration": {
    "mood": "one-phrase mood descriptor | null",
    "lighting": "e.g. golden hour warm side-light | studio editorial dark chiaroscuro | null",
    "palette": ["dominant colors"],
    "composition": "e.g. centered macro | rule-of-thirds with negative space | null",
    "era": "aesthetic era or reference | null"
  },
  "confidence": "high | medium | low",
  "notes": "anything else worth knowing, one sentence max"
}

Rules:
  • If ONE image is provided, fill "jewelry" from it and set "inspiration" to null.
  • If TWO images are provided, the FIRST is the jewelry piece (extract "jewelry"),
    the SECOND is the inspiration reference (extract "inspiration").
  • Use precise jewelry vocabulary — "round brilliant diamond", not "round stone".
  • If a field is truly unknowable from the image, use null. Don't guess wildly.
  • "confidence" reflects how certain you are about the jewelry extraction.`;

const MAX_REDIRECT_HOPS = 3;

async function urlToBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    // Manual redirect loop — every hop (including the initial URL) is
    // re-validated by the SSRF guard so an attacker can't point a public
    // domain at 169.254.169.254 or 127.0.0.1 via 302.
    let current = await assertSafeUrl(url, { allowedProtocols: ['https:', 'http:'] });

    for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
      const resp = await fetch(current.toString(), {
        signal: AbortSignal.timeout(20_000),
        redirect: 'manual',
      });

      // Handle 3xx — extract Location and re-validate before following.
      if (resp.status >= 300 && resp.status < 400) {
        if (hop === MAX_REDIRECT_HOPS) return null; // too many hops
        const location = resp.headers.get('location');
        if (!location) return null;
        const next = new URL(location, current);
        current = await assertSafeUrl(next.toString(), { allowedProtocols: ['https:', 'http:'] });
        continue;
      }

      if (!resp.ok) return null;

      const contentType = resp.headers.get('content-type') || 'image/jpeg';
      if (!/^image\//i.test(contentType)) return null; // refuse non-image bodies

      const buf = Buffer.from(await resp.arrayBuffer());
      return { data: buf.toString('base64'), mimeType: contentType };
    }

    return null;
  } catch (err) {
    if (err instanceof SsrfBlockedError) throw err;
    return null;
  }
}

export async function extractFacts(params: {
  referenceImageUrl: string;
  inspirationImageUrl?: string;
}): Promise<ExtractedFacts> {
  const key = GEMINI_KEY();
  if (!key) throw new Error('GOOGLE_AI_API_KEY not set for vision extraction');

  const ref = await urlToBase64(params.referenceImageUrl);
  if (!ref) throw new Error(`Could not fetch reference image: ${params.referenceImageUrl}`);
  const insp = params.inspirationImageUrl ? await urlToBase64(params.inspirationImageUrl) : null;

  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> = [
    { text: EXTRACTION_PROMPT },
    { inlineData: { mimeType: ref.mimeType, data: ref.data } },
  ];
  if (insp) parts.push({ inlineData: { mimeType: insp.mimeType, data: insp.data } });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${VISION_MODEL}:generateContent?key=${key}`;
  const started = Date.now();

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts }],
      generationConfig: { maxOutputTokens: 800, responseMimeType: 'application/json' },
    }),
  });

  if (!resp.ok) {
    const err = await resp.text().catch(() => '');
    throw new Error(`Gemini vision ${resp.status}: ${err.slice(0, 200)}`);
  }

  const data = await resp.json();
  const rawText: string = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const inputTokens = data.usageMetadata?.promptTokenCount ?? 0;
  const outputTokens = data.usageMetadata?.candidatesTokenCount ?? 0;
  const cost = estimateTokenCost('gemini-3-pro', inputTokens, outputTokens); // Pro-tier pricing proxy

  // Gemini in JSON mode returns pure JSON; but defend against occasional ```json fences
  const cleaned = rawText.replace(/```json\s*/gi, '').replace(/```\s*$/g, '').trim();
  let parsed: Partial<ExtractedFacts & { jewelry: Partial<ExtractedJewelry>; inspiration: Partial<ExtractedInspiration> | null }>;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Fall back to a minimal extraction so caller doesn't crash
    parsed = {
      jewelry: { type: null, metal: null, metalFinish: null, stones: null, setting: null, style: null, distinguishingFeatures: [] },
      inspiration: null,
      confidence: 'low',
      notes: 'Vision extraction returned unparseable JSON',
    };
  }

  void logCost({
    model: VISION_MODEL,
    type: 'analysis',
    cost,
    durationSeconds: (Date.now() - started) / 1000,
    promptPreview: `extract-once: ${params.referenceImageUrl.slice(0, 60)}${insp ? ' +insp' : ''}`,
    inputTokens,
    outputTokens,
  });

  const jewelry: ExtractedJewelry = {
    type: parsed.jewelry?.type ?? null,
    metal: parsed.jewelry?.metal ?? null,
    metalFinish: parsed.jewelry?.metalFinish ?? null,
    stones: parsed.jewelry?.stones ?? null,
    setting: parsed.jewelry?.setting ?? null,
    style: parsed.jewelry?.style ?? null,
    distinguishingFeatures: Array.isArray(parsed.jewelry?.distinguishingFeatures)
      ? parsed.jewelry.distinguishingFeatures
      : [],
  };

  const inspiration: ExtractedInspiration | null = parsed.inspiration
    ? {
        mood: parsed.inspiration.mood ?? null,
        lighting: parsed.inspiration.lighting ?? null,
        palette: Array.isArray(parsed.inspiration.palette) ? parsed.inspiration.palette : [],
        composition: parsed.inspiration.composition ?? null,
        era: parsed.inspiration.era ?? null,
      }
    : null;

  return {
    jewelry,
    inspiration,
    confidence: parsed.confidence ?? 'medium',
    notes: parsed.notes ?? '',
    extractedAt: new Date().toISOString(),
    visionModel: VISION_MODEL,
  };
}

/**
 * Render extracted facts as a compact text block suitable for pinning into
 * a chat system prompt or synthesis user message.
 */
export function factsToContextBlock(facts: ExtractedFacts): string {
  const j = facts.jewelry;
  const i = facts.inspiration;
  const lines: string[] = ['KNOWN FROM UPLOADED IMAGES (do not re-ask):'];

  lines.push('Jewelry:');
  if (j.type) lines.push(`  • Type: ${j.type}`);
  if (j.metal) lines.push(`  • Metal: ${j.metal}${j.metalFinish ? ` (${j.metalFinish} finish)` : ''}`);
  if (j.stones) lines.push(`  • Stones: ${j.stones}`);
  if (j.setting) lines.push(`  • Setting: ${j.setting}`);
  if (j.style) lines.push(`  • Style: ${j.style}`);
  if (j.distinguishingFeatures.length) {
    lines.push(`  • Details: ${j.distinguishingFeatures.join('; ')}`);
  }

  if (i) {
    lines.push('Inspiration reference:');
    if (i.mood) lines.push(`  • Mood: ${i.mood}`);
    if (i.lighting) lines.push(`  • Lighting: ${i.lighting}`);
    if (i.palette.length) lines.push(`  • Palette: ${i.palette.join(', ')}`);
    if (i.composition) lines.push(`  • Composition: ${i.composition}`);
    if (i.era) lines.push(`  • Era: ${i.era}`);
  }

  if (facts.notes) lines.push(`Note: ${facts.notes}`);
  lines.push(`(Vision confidence: ${facts.confidence})`);

  return lines.join('\n');
}
