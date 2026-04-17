import Anthropic from '@anthropic-ai/sdk';

let client: Anthropic | null = null;

export function getAnthropicClient(): Anthropic {
  if (!client) {
    client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }
  return client;
}

// Model ladders by role.
// CONVERSATION → information-gathering turns. Prioritize cheap/fast.
// SYNTHESIS → final prompt generation, council review. Prioritize quality.
export const CONVERSATION_MODELS = [
  'claude-haiku-4-5-20251001',
  'claude-3-5-haiku-20241022',
  // Final safety net — upgrade to Sonnet rather than fail
  'claude-sonnet-4-5-20250514',
] as const;

export const SYNTHESIS_MODELS = [
  'claude-sonnet-4-5-20250514',
  'claude-sonnet-4-20250514',
  'claude-3-5-sonnet-20241022',
] as const;

// Legacy export kept for callers that still import AI_MODELS.
// Treated as synthesis (quality-first) by default.
export const AI_MODELS = SYNTHESIS_MODELS;

export type ChatMode = 'conversation' | 'synthesis';

/**
 * Calls Claude with a model ladder appropriate for the intended use.
 *
 * - `conversation`: cheap Haiku first, Sonnet only as fallback. For chat turns
 *   that gather information from the user.
 * - `synthesis`: Sonnet only. For final prompt generation, Creative Council
 *   debates, or anything where output quality directly affects end-product
 *   image/video fidelity.
 *
 * Returns the raw Anthropic.Message so callers can read `.usage` for accurate
 * per-turn cost accounting.
 */
export async function callWithFallback(
  fn: (model: string) => Promise<Anthropic.Message>,
  mode: ChatMode = 'synthesis',
): Promise<Anthropic.Message> {
  const ladder = mode === 'conversation' ? CONVERSATION_MODELS : SYNTHESIS_MODELS;
  let lastError: unknown;

  for (const model of ladder) {
    try {
      return await fn(model);
    } catch (error) {
      // Retry the next rung for: 404 (model unavailable on key),
      // 503 (transient), 529 (overload).
      if (error instanceof Anthropic.APIError && (error.status === 404 || error.status === 529 || error.status === 503)) {
        lastError = error;
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}
