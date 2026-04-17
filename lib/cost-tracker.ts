import { getDb } from './db';

export type CostType = 'image' | 'video' | 'analysis' | 'chat' | 'synthesis';

export async function logCost(params: {
  model: string;
  type: CostType;
  cost: number;
  durationSeconds?: number;
  promptPreview?: string;
  resultUrl?: string;
  // Token metrics — only meaningful for chat/synthesis/analysis. Persisted
  // inside promptPreview so we don't require a schema migration today.
  inputTokens?: number;
  outputTokens?: number;
}) {
  try {
    const sql = getDb();
    // If token counts were supplied, prepend them into the preview so we
    // keep a human-readable audit trail in the existing text column.
    let preview = params.promptPreview?.slice(0, 180) || null;
    if (params.inputTokens != null || params.outputTokens != null) {
      const tokenTag = `[${fmtTokens(params.inputTokens)}→${fmtTokens(params.outputTokens)}]`;
      preview = preview ? `${tokenTag} ${preview}`.slice(0, 200) : tokenTag;
    }

    await sql`INSERT INTO cost_log (model, type, cost, duration_seconds, prompt_preview, result_url)
      VALUES (${params.model}, ${params.type}, ${params.cost}, ${params.durationSeconds || null}, ${preview}, ${params.resultUrl || null})`;
  } catch {
    // Non-critical — don't break generation if logging fails
  }
}

function fmtTokens(n?: number): string {
  if (n == null) return '?';
  if (n < 1000) return `${n}`;
  return `${(n / 1000).toFixed(1)}k`;
}

// Pricing table for token-based models ($ per 1M tokens).
// Source of truth — used by chat-handler + anthropic fallback wrapper.
export const TOKEN_PRICING = {
  'claude-sonnet-4-5':     { input: 3,     output: 15 },
  'claude-sonnet-4':       { input: 3,     output: 15 },
  'claude-3-5-sonnet':     { input: 3,     output: 15 },
  'claude-haiku-4-5':      { input: 0.80,  output: 4 },
  'claude-3-5-haiku':      { input: 0.80,  output: 4 },
  'gemini-2.5-flash':      { input: 0.075, output: 0.30 },
  'gemini-3-pro':          { input: 1.25,  output: 10 },
} as const;

export type TokenPricedModel = keyof typeof TOKEN_PRICING;

export function estimateTokenCost(
  model: TokenPricedModel | string,
  inputTokens: number,
  outputTokens: number,
): number {
  // Match by prefix so full SDK model IDs (e.g. claude-sonnet-4-20250514) resolve
  const key = Object.keys(TOKEN_PRICING).find(k => model.startsWith(k)) as TokenPricedModel | undefined;
  if (!key) return 0;
  const p = TOKEN_PRICING[key];
  return (inputTokens * p.input + outputTokens * p.output) / 1_000_000;
}
