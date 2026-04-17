#!/usr/bin/env tsx
/**
 * Benchmark: Chat Pipeline A/B comparison
 *
 * A) Current  — Haiku for chat turns, Sonnet for final synthesis
 * B) Proposed — Gemini 3 Pro Vision extract → Gemini 2.5 Flash chat → Sonnet synthesis
 *
 * Runs 3 scripted jewelry conversation scenarios through both pipelines,
 * measures cost, latency, token counts, and JSON reliability.
 *
 * Usage:
 *   pnpm dlx tsx scripts/benchmark-chat-pipelines.ts
 *
 * Optional (enables Stage 1 vision extraction):
 *   BENCHMARK_REF_URL=https://... BENCHMARK_INSP_URL=https://... \
 *   pnpm dlx tsx scripts/benchmark-chat-pipelines.ts
 *
 * Requires: ANTHROPIC_API_KEY, GOOGLE_AI_API_KEY
 *
 * Estimated API spend: ~$1–2 total for a full run.
 */

import 'dotenv/config';
import { config as dotenvConfig } from 'dotenv';
import Anthropic from '@anthropic-ai/sdk';
import { writeFileSync, mkdirSync } from 'fs';

// Load .env.local explicitly (Next.js convention — dotenv/config only reads .env)
dotenvConfig({ path: '.env.local' });

// Pipeline C imports — the new caching + extraction stack
import { CACHED_SYNTHESIS_PREFIX } from '../lib/prompts/smart-concept-cached';
import { estimateTokenCost } from '../lib/cost-tracker';
import { CREATIVE_DIRECTOR_CHAT_PROMPT } from '../lib/prompts/creative-director-chat';
import { SMART_CONCEPT_PROMPT } from '../lib/prompts/smart-concept';

// ─────────────────────────────────────────────────────────────────────────────
// Setup
// ─────────────────────────────────────────────────────────────────────────────
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const GEMINI_KEY = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY || '';
const REF_URL = process.env.BENCHMARK_REF_URL || '';
const INSP_URL = process.env.BENCHMARK_INSP_URL || '';

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY not set — aborting');
  process.exit(1);
}
if (!GEMINI_KEY) {
  console.error('GOOGLE_AI_API_KEY not set — aborting');
  process.exit(1);
}

// Model ladders — each array is tried top-to-bottom until one doesn't 404.
// Adjusted to match this account's actual model access (Haiku 4.5 / Sonnet 4.5
// aren't enabled on this key; fall back to 3.5 Haiku and Sonnet 4).
const HAIKU_LADDER = [
  'claude-haiku-4-5-20251001',
  'claude-3-5-haiku-20241022',
] as const;
const SONNET_LADDER = [
  'claude-sonnet-4-5-20250514',
  'claude-sonnet-4-20250514',
  'claude-3-5-sonnet-20241022',
] as const;
const GEMINI_FLASH = 'gemini-2.5-flash';
const GEMINI_PRO_VISION = 'gemini-2.5-pro';

// Short, focused chat prompt for Pipeline B — 70% smaller than the full one.
const LEAN_CHAT_PROMPT = `You are a luxury jewelry creative director's AI assistant. Your only job in this conversation is to GATHER the creative brief through 2-4 short questions, then end with a structured summary.

Ask ONE focused question per turn. Topics to cover: goal (campaign/ad/launch), platform (Instagram/TikTok/etc), audience, mood, lighting, cultural context (UAE/Ramadan/DSF if relevant).

When you have enough info (usually 4-6 turns), respond with JSON only: {"ready": true, "brief": {"goal": "...", "platform": "...", "audience": "...", "mood": "...", "lighting": "...", "cultural": "..."}}

Keep prose answers under 40 words. Never repeat context back to the user — trust them.`;

// ─────────────────────────────────────────────────────────────────────────────
// Scenarios
// ─────────────────────────────────────────────────────────────────────────────
interface Scenario {
  name: string;
  description: string;
  userTurns: string[];
}

const SCENARIOS: Scenario[] = [
  {
    name: 'Ramadan gold ring',
    description: 'Instagram campaign for a 18k gold Arabic calligraphy ring during Ramadan',
    userTurns: [
      'I want to create an Instagram Reels campaign for our new 18k gold ring with Arabic calligraphy — launching for Ramadan 2026',
      'Target is UAE women 25-40, affluent, who buy for themselves or receive as gifts',
      'Warm, spiritual, luxurious mood — golden hour light, maybe a desert or traditional UAE interior setting',
      '20-second Reel, hero shot plus 2-3 beauty shots',
      'Generate the final concept now',
    ],
  },
  {
    name: 'DSF diamond necklace',
    description: 'Editorial product page for Dubai Shopping Festival diamond necklace launch',
    userTurns: [
      'Product page shoot for our new diamond rivière necklace — launching during DSF 2026',
      'High-net-worth tourists and local collectors, 35-55 age range',
      'Editorial dramatic mood, dark jewel-tone backdrop, single-source lighting to catch every facet',
      'Still images, no video. Need hero plus close-ups of the clasp and individual stones',
      'Please generate',
    ],
  },
  {
    name: 'Bridal bracelet Reel',
    description: 'TikTok-friendly 15s cut for a diamond tennis bracelet, wedding season',
    userTurns: [
      'TikTok ad for a diamond tennis bracelet, wedding season launch',
      'Brides aged 24-32, Gulf region',
      'Romantic, soft, light and airy — morning light, white/cream tones, maybe a hand detail shot',
      '15-second vertical cut, CTA is "shop the bridal edit"',
      'Go ahead and synthesize',
    ],
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Measurement types
// ─────────────────────────────────────────────────────────────────────────────
interface StageMetric {
  stage: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  durationMs: number;
  parsedJson: boolean;
}

interface PipelineResult {
  label: string;
  stages: StageMetric[];
  totalCostUsd: number;
  totalDurationMs: number;
  parseFailures: number;
  finalPrompt: string;
  transcript: string;
}

function sumStages(stages: StageMetric[]) {
  return {
    totalCostUsd: stages.reduce((s, m) => s + m.costUsd, 0),
    totalDurationMs: stages.reduce((s, m) => s + m.durationMs, 0),
    parseFailures: stages.filter(m => !m.parsedJson).length,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Anthropic helper
// ─────────────────────────────────────────────────────────────────────────────
async function claudeChat(
  ladder: readonly string[],
  system: string,
  messages: Anthropic.MessageParam[],
  maxTokens = 1500,
): Promise<{ text: string; modelUsed: string; inputTokens: number; outputTokens: number }> {
  let lastErr: unknown;
  for (const m of ladder) {
    try {
      const msg = await anthropic.messages.create({ model: m, max_tokens: maxTokens, system, messages });
      const text = msg.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map(b => b.text).join('');
      return { text, modelUsed: m, inputTokens: msg.usage.input_tokens, outputTokens: msg.usage.output_tokens };
    } catch (e) {
      lastErr = e;
      if (e instanceof Anthropic.APIError && (e.status === 404 || e.status === 529 || e.status === 503)) continue;
      throw e;
    }
  }
  throw lastErr;
}

// ─────────────────────────────────────────────────────────────────────────────
// Gemini helper
// ─────────────────────────────────────────────────────────────────────────────
interface GeminiContent {
  role: 'user' | 'model';
  parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }>;
}

async function geminiChat(
  model: string,
  systemInstruction: string,
  contents: GeminiContent[],
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;
  const body = {
    system_instruction: { parts: [{ text: systemInstruction }] },
    contents,
    generationConfig: { maxOutputTokens: 1500 },
  };
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Gemini ${resp.status}: ${err.slice(0, 200)}`);
  }
  const data = await resp.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const inputTokens = data.usageMetadata?.promptTokenCount ?? 0;
  const outputTokens = data.usageMetadata?.candidatesTokenCount ?? 0;
  return { text, inputTokens, outputTokens };
}

async function urlToBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const buf = Buffer.from(await r.arrayBuffer());
    return { data: buf.toString('base64'), mimeType: r.headers.get('content-type') || 'image/jpeg' };
  } catch {
    return null;
  }
}

function tryParseJson(s: string): boolean {
  const match = s.match(/\{[\s\S]*\}/);
  if (!match) return false;
  try { JSON.parse(match[0]); return true; } catch { return false; }
}

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE A — Current: Haiku chat, Sonnet synthesis. Full system prompt. No
// vision extraction step (images re-sent with every turn in the real app; we
// skip inline image bytes in the benchmark when URLs aren't supplied).
// ─────────────────────────────────────────────────────────────────────────────
async function runCurrentPipeline(s: Scenario): Promise<PipelineResult> {
  const stages: StageMetric[] = [];
  const history: Anthropic.MessageParam[] = [];
  const transcript: string[] = [`## Pipeline A — Current (Haiku → Sonnet)\n`];

  // Optional: include reference image on turn 1 (realistic production behavior)
  const firstTurnImage = REF_URL ? await urlToBase64(REF_URL) : null;

  for (let i = 0; i < s.userTurns.length; i++) {
    const userMsg = s.userTurns[i];
    const isFinal = i === s.userTurns.length - 1;
    transcript.push(`\n**User:** ${userMsg}`);

    if (isFinal) {
      // Final turn — hand off to Sonnet for synthesis using SMART_CONCEPT_PROMPT
      history.push({ role: 'user', content: userMsg });
      const t0 = Date.now();
      const out = await claudeChat(SONNET_LADDER, SMART_CONCEPT_PROMPT, history, 3000);
      const dur = Date.now() - t0;
      const cost = estimateTokenCost(out.modelUsed, out.inputTokens, out.outputTokens);
      stages.push({
        stage: 'synthesis',
        model: out.modelUsed,
        inputTokens: out.inputTokens,
        outputTokens: out.outputTokens,
        costUsd: cost,
        durationMs: dur,
        parsedJson: tryParseJson(out.text),
      });
      transcript.push(`\n**Sonnet (synthesis):** ${out.text.slice(0, 400)}...`);
      return {
        label: 'Current (Haiku → Sonnet)',
        stages,
        ...sumStages(stages),
        finalPrompt: out.text,
        transcript: transcript.join('\n'),
      };
    }

    // Regular chat turn on Haiku
    if (i === 0 && firstTurnImage) {
      history.push({
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: firstTurnImage.mimeType as 'image/jpeg', data: firstTurnImage.data } },
          { type: 'text', text: userMsg },
        ],
      });
    } else {
      history.push({ role: 'user', content: userMsg });
    }

    const t0 = Date.now();
    const out = await claudeChat(HAIKU_LADDER, CREATIVE_DIRECTOR_CHAT_PROMPT, history, 1500);
    const dur = Date.now() - t0;
    const cost = estimateTokenCost(out.modelUsed, out.inputTokens, out.outputTokens);
    stages.push({
      stage: `chat turn ${i + 1}`,
      model: out.modelUsed,
      inputTokens: out.inputTokens,
      outputTokens: out.outputTokens,
      costUsd: cost,
      durationMs: dur,
      parsedJson: true, // chat responses are free-form, not JSON
    });
    history.push({ role: 'assistant', content: out.text });
    transcript.push(`\n**Haiku:** ${out.text.slice(0, 300)}${out.text.length > 300 ? '…' : ''}`);
  }

  // Shouldn't reach here
  return { label: 'Current', stages, ...sumStages(stages), finalPrompt: '', transcript: transcript.join('\n') };
}

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE B — Proposed: Gemini Pro Vision extract (once), Flash chat, Sonnet synthesis
// ─────────────────────────────────────────────────────────────────────────────
async function runProposedPipeline(s: Scenario): Promise<PipelineResult> {
  const stages: StageMetric[] = [];
  const transcript: string[] = [`## Pipeline B — Proposed (Gemini Pro → Flash → Sonnet)\n`];

  // ── Stage 1: Extract structured facts from uploaded images (once) ──
  let extractedFactsJson = '';
  if (REF_URL) {
    const ref = await urlToBase64(REF_URL);
    const insp = INSP_URL ? await urlToBase64(INSP_URL) : null;
    if (ref) {
      const parts: GeminiContent['parts'] = [
        { text: 'Extract structured facts about these jewelry reference images. Return ONLY this JSON: {"jewelry": {"type": "...", "metal": "...", "stones": "...", "setting": "...", "style": "..."}, "inspiration": {"mood": "...", "lighting": "...", "composition": "..."}}' },
        { inlineData: { mimeType: ref.mimeType, data: ref.data } },
      ];
      if (insp) parts.push({ inlineData: { mimeType: insp.mimeType, data: insp.data } });

      const t0 = Date.now();
      const out = await geminiChat(GEMINI_PRO_VISION, 'You are a precise jewelry visual analyzer. Output JSON only.', [{ role: 'user', parts }]);
      const dur = Date.now() - t0;
      const cost = estimateTokenCost('gemini-3-pro', out.inputTokens, out.outputTokens);
      extractedFactsJson = out.text;
      stages.push({
        stage: 'extract',
        model: GEMINI_PRO_VISION,
        inputTokens: out.inputTokens,
        outputTokens: out.outputTokens,
        costUsd: cost,
        durationMs: dur,
        parsedJson: tryParseJson(out.text),
      });
      transcript.push(`\n**Gemini Pro Vision extracted facts:** ${out.text.slice(0, 300)}...`);
    }
  }

  // ── Stage 2: Chat turns with Gemini Flash (facts pinned in system) ──
  const flashSystem = `${LEAN_CHAT_PROMPT}\n\n${extractedFactsJson ? `ALREADY KNOWN FROM UPLOADED IMAGES:\n${extractedFactsJson}\n\nDo not ask about facts already listed above.` : ''}`;
  const contents: GeminiContent[] = [];

  for (let i = 0; i < s.userTurns.length - 1; i++) {
    const userMsg = s.userTurns[i];
    contents.push({ role: 'user', parts: [{ text: userMsg }] });
    transcript.push(`\n**User:** ${userMsg}`);

    const t0 = Date.now();
    const out = await geminiChat(GEMINI_FLASH, flashSystem, contents);
    const dur = Date.now() - t0;
    const cost = estimateTokenCost('gemini-2.5-flash', out.inputTokens, out.outputTokens);
    stages.push({
      stage: `chat turn ${i + 1}`,
      model: GEMINI_FLASH,
      inputTokens: out.inputTokens,
      outputTokens: out.outputTokens,
      costUsd: cost,
      durationMs: dur,
      parsedJson: true,
    });
    contents.push({ role: 'model', parts: [{ text: out.text }] });
    transcript.push(`\n**Flash:** ${out.text.slice(0, 300)}${out.text.length > 300 ? '…' : ''}`);
  }

  // ── Stage 3: Final synthesis on Sonnet with extracted facts + full chat ──
  const finalUser = s.userTurns[s.userTurns.length - 1];
  transcript.push(`\n**User:** ${finalUser}`);

  const chatSummary = contents.map(c => `${c.role.toUpperCase()}: ${c.parts.map(p => p.text || '').join('')}`).join('\n');
  const synthesisPrompt = `EXTRACTED FACTS (from uploaded images):\n${extractedFactsJson || '(no images provided)'}\n\nCONVERSATION TRANSCRIPT:\n${chatSummary}\n\nUSER'S FINAL BRIEF: ${finalUser}\n\nProduce the final Gemini 3 Pro image generation prompt + campaign concept in the structured JSON format from your instructions.`;

  const t0 = Date.now();
  const synthOut = await claudeChat(SONNET_LADDER, SMART_CONCEPT_PROMPT, [{ role: 'user', content: synthesisPrompt }], 3000);
  const dur = Date.now() - t0;
  const cost = estimateTokenCost(synthOut.modelUsed, synthOut.inputTokens, synthOut.outputTokens);
  stages.push({
    stage: 'synthesis',
    model: synthOut.modelUsed,
    inputTokens: synthOut.inputTokens,
    outputTokens: synthOut.outputTokens,
    costUsd: cost,
    durationMs: dur,
    parsedJson: tryParseJson(synthOut.text),
  });
  transcript.push(`\n**Sonnet (synthesis):** ${synthOut.text.slice(0, 400)}...`);

  return {
    label: 'Proposed (Pro → Flash → Sonnet)',
    stages,
    ...sumStages(stages),
    finalPrompt: synthOut.text,
    transcript: transcript.join('\n'),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE C — Skip-chat + prompt caching.
//
// Flow: pretend user supplied a detailed brief directly. No chat turns.
// One synthesis call on Sonnet with CACHED_SYNTHESIS_PREFIX as cached system.
//
// For benchmark purposes we FIRE the synthesis twice back-to-back per scenario
// so we can observe both the cache-write (first call) and cache-read
// (second call) behavior. Real users doing multi-variant generations will see
// the cache-read pricing on call #2 onwards.
// ─────────────────────────────────────────────────────────────────────────────
async function runSkipChatPipeline(s: Scenario): Promise<PipelineResult> {
  const stages: StageMetric[] = [];
  const transcript: string[] = [`## Pipeline C — Skip-Chat (Extract + Cached Sonnet)\n`];

  // Build a detailed brief from the scripted turns so the synthesizer has
  // equivalent information without needing a chat round-trip.
  const combinedBrief = s.userTurns.join(' | ');
  transcript.push(`\n**User brief:** ${combinedBrief}`);

  // Two synthesis calls to observe cache behavior (write then read).
  for (let attempt = 0; attempt < 2; attempt++) {
    const label = attempt === 0 ? 'synthesis (cache write)' : 'synthesis (cache read)';
    const t0 = Date.now();

    // Call Anthropic directly with prompt caching
    let modelUsed = '';
    let result: Anthropic.Message | null = null;
    let lastErr: unknown;
    for (const m of SONNET_LADDER) {
      try {
        result = await anthropic.messages.create({
          model: m,
          max_tokens: 3000,
          system: [
            { type: 'text', text: CACHED_SYNTHESIS_PREFIX, cache_control: { type: 'ephemeral' } },
          ],
          messages: [{ role: 'user', content: `USER BRIEF:\n${combinedBrief}\n\nSynthesize the final production prompt JSON now.` }],
        });
        modelUsed = m;
        break;
      } catch (e) {
        lastErr = e;
        if (e instanceof Anthropic.APIError && (e.status === 404 || e.status === 529 || e.status === 503)) continue;
        throw e;
      }
    }
    if (!result) throw lastErr;

    const dur = Date.now() - t0;
    const usage = result.usage as Anthropic.Usage & {
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
    const inTok = usage.input_tokens;
    const outTok = usage.output_tokens;
    const cacheRead = usage.cache_read_input_tokens ?? 0;
    const cacheWrite = usage.cache_creation_input_tokens ?? 0;

    // Cost: base input at $3/M, cache writes at +25%, cache reads at 10%
    const basePerM = 3;
    const outPerM = 15;
    const cost =
      (inTok * basePerM) / 1_000_000 +
      (cacheWrite * basePerM * 1.25) / 1_000_000 +
      (cacheRead * basePerM * 0.10) / 1_000_000 +
      (outTok * outPerM) / 1_000_000;

    const text = result.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map(b => b.text).join('');

    stages.push({
      stage: label,
      model: modelUsed,
      inputTokens: inTok + cacheRead + cacheWrite,
      outputTokens: outTok,
      costUsd: cost,
      durationMs: dur,
      parsedJson: tryParseJson(text),
    });

    transcript.push(
      `\n**Attempt ${attempt + 1} (${label}):**`,
      `   Model: ${modelUsed}`,
      `   Input (fresh): ${inTok} tok, Cache write: ${cacheWrite} tok, Cache read: ${cacheRead} tok`,
      `   Output: ${outTok} tok, Duration: ${(dur / 1000).toFixed(1)}s, Cost: $${cost.toFixed(4)}`,
    );

    // Return the second attempt's text as the "final prompt" since that's the
    // steady-state experience (cache is warm for any session after the first).
    if (attempt === 1) {
      return {
        label: 'Skip-Chat + Cached Sonnet',
        stages,
        ...sumStages(stages),
        finalPrompt: text,
        transcript: transcript.join('\n'),
      };
    }
  }

  throw new Error('unreachable');
}

// ─────────────────────────────────────────────────────────────────────────────
// Report
// ─────────────────────────────────────────────────────────────────────────────
function formatUsd(n: number): string { return `$${n.toFixed(4)}`; }
function formatMs(n: number): string { return `${(n / 1000).toFixed(1)}s`; }

interface ScenarioResult { scenario: Scenario; a: PipelineResult; b: PipelineResult; c: PipelineResult; }

function formatReport(results: ScenarioResult[]): string {
  const lines: string[] = [];
  lines.push('# Chat Pipeline Benchmark — Three-Way\n');
  lines.push(`Run at: ${new Date().toISOString()}`);
  lines.push(`Images supplied: ${REF_URL ? 'YES' : 'no (Stage 1 vision skipped in Pipeline B/C)'}\n`);
  lines.push(`Pipelines tested:`);
  lines.push(`- **A** — Current: Haiku chat turns + Sonnet synthesis`);
  lines.push(`- **B** — Flash chat turns + Sonnet synthesis`);
  lines.push(`- **C** — Skip-chat: extract-once + cached Sonnet synthesis (measures 1st call write + 2nd call read)\n`);

  for (const { scenario, a, b, c } of results) {
    lines.push(`\n## ${scenario.name}`);
    lines.push(`_${scenario.description}_\n`);
    lines.push(`| Metric | A (current) | B (Flash) | C (skip+cache) |`);
    lines.push(`|---|---|---|---|`);
    lines.push(`| **Total cost** | ${formatUsd(a.totalCostUsd)} | ${formatUsd(b.totalCostUsd)} | ${formatUsd(c.totalCostUsd)} |`);
    lines.push(`| **Total latency** | ${formatMs(a.totalDurationMs)} | ${formatMs(b.totalDurationMs)} | ${formatMs(c.totalDurationMs)} |`);
    lines.push(`| Stages | ${a.stages.length} | ${b.stages.length} | ${c.stages.length} (w/r) |`);
    lines.push(`| Parse failures | ${a.parseFailures} | ${b.parseFailures} | ${c.parseFailures} |`);
    lines.push(`| Final prompt length | ${a.finalPrompt.length} | ${b.finalPrompt.length} | ${c.finalPrompt.length} |`);

    const label = (p: PipelineResult) => `\n**Stage breakdown (${p.label}):**`;
    const dump = (p: PipelineResult) => {
      for (const st of p.stages) {
        lines.push(`- ${st.stage} · ${st.model.slice(0, 28)} · ${st.inputTokens}→${st.outputTokens} tok · ${formatUsd(st.costUsd)} · ${formatMs(st.durationMs)}`);
      }
    };
    lines.push(label(a)); dump(a);
    lines.push(label(b)); dump(b);
    lines.push(label(c)); dump(c);
  }

  const totalA = results.reduce((s, r) => s + r.a.totalCostUsd, 0);
  const totalB = results.reduce((s, r) => s + r.b.totalCostUsd, 0);
  const totalC_steadystate = results.reduce((s, r) => {
    // Cache-read is the steady-state cost (2nd and onward calls within 5 min)
    const readStage = r.c.stages.find(st => st.stage.includes('cache read'));
    return s + (readStage?.costUsd ?? r.c.totalCostUsd / 2);
  }, 0);
  const meanLatA = results.reduce((s, r) => s + r.a.totalDurationMs, 0) / results.length;
  const meanLatB = results.reduce((s, r) => s + r.b.totalDurationMs, 0) / results.length;
  const meanLatC = results.reduce((s, r) => {
    const readStage = r.c.stages.find(st => st.stage.includes('cache read'));
    return s + (readStage?.durationMs ?? r.c.totalDurationMs / 2);
  }, 0) / results.length;

  lines.push(`\n---\n`);
  lines.push(`## Summary (${results.length} scenarios)\n`);
  lines.push(`| Metric | A (current) | B (Flash) | C steady-state (cached) |`);
  lines.push(`|---|---|---|---|`);
  lines.push(`| Total cost | ${formatUsd(totalA)} | ${formatUsd(totalB)} | ${formatUsd(totalC_steadystate)} |`);
  lines.push(`| Mean cost/session | ${formatUsd(totalA / results.length)} | ${formatUsd(totalB / results.length)} | ${formatUsd(totalC_steadystate / results.length)} |`);
  lines.push(`| Mean latency/session | ${formatMs(meanLatA)} | ${formatMs(meanLatB)} | ${formatMs(meanLatC)} |`);
  lines.push(`| vs A (cheaper by) | — | ${(totalA / Math.max(totalB, 1e-9)).toFixed(1)}× | **${(totalA / Math.max(totalC_steadystate, 1e-9)).toFixed(1)}×** |`);

  lines.push(`\n### Pro-pack monthly COGS projection`);
  lines.push(`Assuming 2,000 completed sessions/month per Pro subscriber:\n`);
  lines.push(`- Pipeline A (current): **$${(totalA / results.length * 2000).toFixed(0)}** /month`);
  lines.push(`- Pipeline B (Flash chat): **$${(totalB / results.length * 2000).toFixed(0)}** /month`);
  lines.push(`- Pipeline C (skip+cache): **$${(totalC_steadystate / results.length * 2000).toFixed(0)}** /month`);
  lines.push(`- **Savings A → C per subscriber: $${((totalA - totalC_steadystate) / results.length * 2000).toFixed(0)} /month**`);

  lines.push(`\n### Final prompt quality (eyeball these manually)\n`);
  for (const r of results) {
    lines.push(`\n#### ${r.scenario.name}`);
    lines.push(`**A final prompt (first 500 chars):**\n\`\`\`\n${r.a.finalPrompt.slice(0, 500)}\n\`\`\``);
    lines.push(`**B final prompt (first 500 chars):**\n\`\`\`\n${r.b.finalPrompt.slice(0, 500)}\n\`\`\``);
    lines.push(`**C final prompt (first 500 chars):**\n\`\`\`\n${r.c.finalPrompt.slice(0, 500)}\n\`\`\``);
  }

  return lines.join('\n');
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
  mkdirSync('/tmp/benchmark-output', { recursive: true });
  console.log(`\n╔══════════════════════════════════════════════════════════╗`);
  console.log(`║  Chat Pipeline Benchmark — Current vs 3-Stage Proposed   ║`);
  console.log(`╚══════════════════════════════════════════════════════════╝\n`);
  console.log(`Scenarios:   ${SCENARIOS.length}`);
  console.log(`Images:      ${REF_URL ? 'yes — full Stage 1 vision included' : 'no — Stage 1 skipped'}`);
  console.log(`Estimated:   ~$1-2 total API spend\n`);

  const results: ScenarioResult[] = [];

  for (let i = 0; i < SCENARIOS.length; i++) {
    const scenario = SCENARIOS[i];
    console.log(`\n[${i + 1}/${SCENARIOS.length}] ${scenario.name}`);

    console.log(`  └─ Running Pipeline A (current: Haiku chat + Sonnet synth)...`);
    const a = await runCurrentPipeline(scenario);
    console.log(`     ✓ ${formatUsd(a.totalCostUsd)} · ${formatMs(a.totalDurationMs)} · ${a.stages.length} stages`);

    console.log(`  └─ Running Pipeline B (Flash chat + Sonnet synth)...`);
    const b = await runProposedPipeline(scenario);
    console.log(`     ✓ ${formatUsd(b.totalCostUsd)} · ${formatMs(b.totalDurationMs)} · ${b.stages.length} stages`);

    console.log(`  └─ Running Pipeline C (skip-chat + cached Sonnet)...`);
    const c = await runSkipChatPipeline(scenario);
    const cRead = c.stages.find(st => st.stage.includes('cache read'));
    console.log(`     ✓ write: ${formatUsd(c.stages[0].costUsd)} · read: ${formatUsd(cRead?.costUsd ?? 0)} · steady-state ${(c.stages[0].costUsd / Math.max(cRead?.costUsd ?? 1e-9, 1e-9)).toFixed(1)}× savings`);

    results.push({ scenario, a, b, c });

    const slug = scenario.name.replace(/\s+/g, '-');
    writeFileSync(`/tmp/benchmark-output/${slug}-A.md`, a.transcript);
    writeFileSync(`/tmp/benchmark-output/${slug}-B.md`, b.transcript);
    writeFileSync(`/tmp/benchmark-output/${slug}-C.md`, c.transcript);
  }

  const report = formatReport(results);
  writeFileSync('/tmp/benchmark-output/REPORT.md', report);
  console.log('\n' + report);
  console.log(`\n\nTranscripts + full report saved to /tmp/benchmark-output/\n`);
}

main().catch(err => {
  console.error('\nBenchmark failed:', err);
  process.exit(1);
});
