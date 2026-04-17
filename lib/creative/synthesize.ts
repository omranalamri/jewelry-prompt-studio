/**
 * Creative Synthesis with Anthropic Prompt Caching
 *
 * Takes extracted image facts + optional conversation transcript + user brief
 * and produces a production-ready Gemini 3 Pro / Veo 3.1 prompt JSON.
 *
 * Pricing economics (Sonnet 4/4.5):
 *   Normal input:       $3.00 per 1M tokens
 *   Cache write:        $3.75 per 1M tokens (first call in 5-min window, +25%)
 *   Cache read:         $0.30 per 1M tokens (subsequent calls, 90% off)
 *
 * Our cached prefix is ~2,200 tokens. At 100 synthesis calls/hour:
 *   Without caching: 100 × 2200 × $3/M = $0.66
 *   With caching:    1 × 2200 × $3.75/M + 99 × 2200 × $0.30/M = $0.073
 *   → 9× cheaper on the prefix portion alone
 *
 * Quality: zero degradation. Same model, same prompt. Caching is purely a
 * billing optimization.
 */

import Anthropic from '@anthropic-ai/sdk';
import { getAnthropicClient, SYNTHESIS_MODELS } from '@/lib/anthropic';
import { CACHED_SYNTHESIS_PREFIX } from '@/lib/prompts/smart-concept-cached';
import { factsToContextBlock, type ExtractedFacts } from '@/lib/creative/extract-once';
import { logCost, estimateTokenCost } from '@/lib/cost-tracker';
import { parseClaudeJSON } from '@/lib/utils/parseResponse';

export interface SynthesizeInput {
  /** User's final brief text (required) */
  userBrief: string;
  /** Extracted image facts from /api/creative/extract, if any */
  extractedFacts?: ExtractedFacts;
  /** Prior conversation transcript as plain text, if any */
  conversationTranscript?: string;
  /** Optional override for the synthesis model ladder */
  modelLadder?: readonly string[];
}

export interface SynthesizeResult {
  raw: string;
  parsed: unknown;
  modelUsed: string;
  inputTokens: number;
  outputTokens: number;
  /** Tokens served from cache (0 if no cache hit) */
  cacheReadTokens: number;
  /** Tokens written to cache (0 if cache was already warm) */
  cacheCreationTokens: number;
  costUsd: number;
  durationMs: number;
}

/**
 * Synthesize a production creative prompt with prompt caching enabled.
 *
 * The cached prefix includes the full SMART_CONCEPT instructions, jewelry
 * taxonomy, Gulf/UAE cultural context, lighting vocabulary, and Gemini/Veo
 * best practices. It stays warm for 5 minutes across all callers.
 */
export async function synthesize(input: SynthesizeInput): Promise<SynthesizeResult> {
  const client = getAnthropicClient();
  const ladder = input.modelLadder ?? SYNTHESIS_MODELS;

  // ── Build the dynamic user message (NOT cached) ──
  const userMessageParts: string[] = [];

  if (input.extractedFacts) {
    userMessageParts.push(factsToContextBlock(input.extractedFacts));
    userMessageParts.push('');
  }

  if (input.conversationTranscript?.trim()) {
    userMessageParts.push('CONVERSATION SO FAR:');
    userMessageParts.push(input.conversationTranscript.trim());
    userMessageParts.push('');
  }

  userMessageParts.push('USER BRIEF:');
  userMessageParts.push(input.userBrief);
  userMessageParts.push('');
  userMessageParts.push('Synthesize the final production prompt JSON now.');

  const userText = userMessageParts.join('\n');

  // ── System prompt with cache_control on the stable prefix ──
  // When the prefix is >= 1,024 tokens (which it is at ~2,200), Anthropic will
  // cache it for 5 minutes. Subsequent calls hit cache_read pricing.
  const system: Anthropic.TextBlockParam[] = [
    {
      type: 'text',
      text: CACHED_SYNTHESIS_PREFIX,
      cache_control: { type: 'ephemeral' },
    },
  ];

  const started = Date.now();
  let lastErr: unknown;

  for (const model of ladder) {
    try {
      const message = await client.messages.create({
        model,
        max_tokens: 3000,
        system,
        messages: [{ role: 'user', content: userText }],
      });

      const raw = message.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');

      // Usage fields — `cache_creation_input_tokens` and `cache_read_input_tokens`
      // are populated by Anthropic when caching is in effect.
      const usage = message.usage as Anthropic.Usage & {
        cache_creation_input_tokens?: number;
        cache_read_input_tokens?: number;
      };
      // Anthropic's usage.input_tokens = FRESH non-cached input only.
      // Cache write/read are tracked separately and billed at 125% / 10%.
      const freshInputTokens = usage.input_tokens;
      const outputTokens = usage.output_tokens;
      const cacheReadTokens = usage.cache_read_input_tokens ?? 0;
      const cacheCreationTokens = usage.cache_creation_input_tokens ?? 0;
      const inputTokens = freshInputTokens; // exposed to caller for display (fresh only)

      const perMTok = estimateTokenCost(model, 1_000_000, 0);   // $ / 1M input
      const perMOut = estimateTokenCost(model, 0, 1_000_000);   // $ / 1M output
      const costUsd =
        (freshInputTokens * perMTok) / 1_000_000 +
        (cacheCreationTokens * perMTok * 1.25) / 1_000_000 +
        (cacheReadTokens * perMTok * 0.10) / 1_000_000 +
        (outputTokens * perMOut) / 1_000_000;

      const durationMs = Date.now() - started;

      void logCost({
        model,
        type: 'synthesis',
        cost: costUsd,
        durationSeconds: durationMs / 1000,
        promptPreview: `synth${cacheReadTokens ? ` [cache hit ${cacheReadTokens}tok]` : cacheCreationTokens ? ` [cache write ${cacheCreationTokens}tok]` : ''}: ${input.userBrief.slice(0, 80)}`,
        inputTokens: inputTokens + cacheReadTokens + cacheCreationTokens,
        outputTokens,
      });

      const parsed = parseClaudeJSON(raw) ?? { content: raw };

      return {
        raw,
        parsed,
        modelUsed: model,
        inputTokens,
        outputTokens,
        cacheReadTokens,
        cacheCreationTokens,
        costUsd,
        durationMs,
      };
    } catch (e) {
      lastErr = e;
      if (e instanceof Anthropic.APIError && (e.status === 404 || e.status === 529 || e.status === 503)) {
        continue;
      }
      throw e;
    }
  }

  throw lastErr;
}
