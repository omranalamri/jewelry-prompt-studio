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

// Try these models in order — different API keys have access to different models
export const AI_MODELS = [
  'claude-sonnet-4-20250514',
  'claude-sonnet-4-5-20250514',
  'claude-3-5-sonnet-20241022',
] as const;

export async function callWithFallback(
  fn: (model: string) => Promise<Anthropic.Message>
): Promise<Anthropic.Message> {
  let lastError: unknown;
  for (const model of AI_MODELS) {
    try {
      return await fn(model);
    } catch (error) {
      if (error instanceof Anthropic.APIError && error.status === 404) {
        lastError = error;
        continue; // try next model
      }
      throw error; // non-404 errors propagate immediately
    }
  }
  throw lastError;
}
