import { getAnthropicClient, callWithFallback, type ChatMode } from '@/lib/anthropic';
import { parseClaudeJSON } from '@/lib/utils/parseResponse';
import { buildEnhancedPrompt } from '@/lib/learning/prompt-builder';
import { logCost, estimateTokenCost } from '@/lib/cost-tracker';
import { CACHED_SYNTHESIS_PREFIX } from '@/lib/prompts/smart-concept-cached';
import Anthropic from '@anthropic-ai/sdk';

interface ChatImage {
  base64: string;
  mediaType: string;
}

interface IncomingMessage {
  role: 'user' | 'assistant';
  content: string;
  rawJson?: string;
  images?: ChatImage[];
}

export interface ChatHandlerOptions {
  /**
   * `conversation` (default): cheap Haiku for info-gathering turns.
   * `synthesis`: quality Sonnet for final prompt generation / council review.
   */
  mode?: ChatMode;
  /** Optional jewelry type hint used by prompt enhancer. */
  jewelryType?: string;
}

export async function handleChatRequest(
  messages: IncomingMessage[],
  systemPrompt: string,
  optsOrJewelryType?: ChatHandlerOptions | string,
): Promise<{ success: true; data: unknown; rawJson: string } | { success: false; error: string; code: string; status: number }> {
  if (!messages || messages.length === 0) {
    return { success: false, error: 'Please provide a message.', code: 'MISSING_INPUT', status: 400 };
  }

  // Backwards-compat: older callers pass jewelryType as a plain string.
  const opts: ChatHandlerOptions = typeof optsOrJewelryType === 'string'
    ? { jewelryType: optsOrJewelryType }
    : (optsOrJewelryType || {});
  const mode: ChatMode = opts.mode ?? 'conversation';

  const enhancedPrompt = await buildEnhancedPrompt({
    basePrompt: systemPrompt,
    jewelryType: opts.jewelryType,
  });

  const formatted: Anthropic.MessageParam[] = messages.map((msg) => {
    if (msg.role === 'assistant') {
      return { role: 'assistant' as const, content: msg.rawJson || msg.content };
    }
    if (msg.images && msg.images.length > 0) {
      const blocks: Anthropic.ContentBlockParam[] = [];
      for (const img of msg.images) {
        blocks.push({
          type: 'image',
          source: { type: 'base64', media_type: img.mediaType as 'image/jpeg', data: img.base64 },
        });
      }
      blocks.push({ type: 'text', text: msg.content || 'Analyze this image.' });
      return { role: 'user' as const, content: blocks };
    }
    return { role: 'user' as const, content: msg.content };
  });

  const turnStart = Date.now();
  const lastUserText = [...messages].reverse().find(m => m.role === 'user')?.content || '';
  const hasImages = messages.some(m => m.images && m.images.length > 0);

  try {
    let rawText: string;
    let usedModel = '';
    let usedGemini = false;
    let inputTokens = 0;
    let outputTokens = 0;
    let costUsd = 0;

    try {
      const anthropic = getAnthropicClient();

      // Build the system parameter. For synthesis mode, prepend the cached
      // jewelry-expertise prefix with cache_control. This gives chat-path users
      // the same 90% input-token discount that /api/generate/from-facts enjoys.
      // The prefix is ~2,200 tokens which exceeds Sonnet's 1024-token minimum.
      const systemParam: string | Anthropic.TextBlockParam[] =
        mode === 'synthesis'
          ? [
              { type: 'text', text: CACHED_SYNTHESIS_PREFIX, cache_control: { type: 'ephemeral' } },
              { type: 'text', text: enhancedPrompt },
            ]
          : enhancedPrompt;

      const message = await callWithFallback(
        (model) => {
          usedModel = model;
          return anthropic.messages.create({
            model,
            max_tokens: mode === 'conversation' ? 1500 : 4000,
            system: systemParam,
            messages: formatted,
          });
        },
        mode,
      );

      rawText = message.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');

      // Anthropic semantics (verified against dashboard):
      //   usage.input_tokens             = fresh non-cached input tokens (100% rate)
      //   usage.cache_creation_*_tokens  = tokens written to cache (125% rate, one-time)
      //   usage.cache_read_*_tokens      = tokens served from cache (10% rate)
      const usage = message.usage as Anthropic.Usage & {
        cache_creation_input_tokens?: number;
        cache_read_input_tokens?: number;
      };
      const freshInputTokens = message.usage.input_tokens;
      const cacheWriteTokens = usage.cache_creation_input_tokens ?? 0;
      const cacheReadTokens = usage.cache_read_input_tokens ?? 0;
      outputTokens = message.usage.output_tokens;
      // Total prompt size surfaced to callers (for display/debug)
      inputTokens = freshInputTokens + cacheWriteTokens + cacheReadTokens;

      // Derive per-1M rates from the pricing table for this model
      const perMTokInput = estimateTokenCost(usedModel, 1_000_000, 0);
      const perMTokOutput = estimateTokenCost(usedModel, 0, 1_000_000);
      costUsd =
        (freshInputTokens * perMTokInput) / 1_000_000 +
        (cacheWriteTokens * perMTokInput * 1.25) / 1_000_000 +
        (cacheReadTokens * perMTokInput * 0.10) / 1_000_000 +
        (outputTokens * perMTokOutput) / 1_000_000;
    } catch (claudeError) {
      // Claude fully unavailable — fall back to Gemini Flash
      const geminiKey = process.env.GOOGLE_AI_API_KEY || process.env.GEMINI_API_KEY;
      if (!geminiKey) throw claudeError;

      const geminiContents = [
        { role: 'user', parts: [{ text: `System instructions: ${enhancedPrompt}\n\nRespond as a luxury jewelry creative AI assistant. Be helpful, specific, and knowledgeable about jewelry design, photography, and marketing.` }] },
        { role: 'model', parts: [{ text: 'Understood. I am your luxury jewelry creative AI assistant, ready to help with design, photography, marketing, and campaign creation.' }] },
        ...messages.map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
      ];

      const resp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: geminiContents }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error((err as { error?: { message?: string } }).error?.message || `Gemini ${resp.status}`);
      }

      const gemData = await resp.json();
      rawText = gemData.candidates?.[0]?.content?.parts?.[0]?.text || 'No response from AI.';
      inputTokens = gemData.usageMetadata?.promptTokenCount ?? 0;
      outputTokens = gemData.usageMetadata?.candidatesTokenCount ?? 0;
      usedModel = 'gemini-2.5-flash';
      costUsd = estimateTokenCost(usedModel, inputTokens, outputTokens);
      usedGemini = true;
    }

    // Persist cost for dashboard / margin analysis. Fire-and-forget.
    void logCost({
      model: usedModel,
      type: mode === 'conversation' ? 'chat' : 'synthesis',
      cost: costUsd,
      durationSeconds: (Date.now() - turnStart) / 1000,
      promptPreview: lastUserText.slice(0, 120) + (hasImages ? ' [+img]' : ''),
      inputTokens,
      outputTokens,
    });

    if (usedGemini) {
      return { success: true, data: { content: rawText, model: usedModel }, rawJson: rawText };
    }

    const data = parseClaudeJSON(rawText);
    if (!data) {
      return { success: true, data: { content: rawText }, rawJson: rawText };
    }

    // Auto-cache reference analyses when the AI analyzes images
    try {
      const parsed = data as Record<string, unknown>;
      if (parsed.analysis && typeof parsed.analysis === 'object') {
        const { cacheAnalysis } = await import('@/lib/learning/reference-cache');
        const analysis = parsed.analysis as Record<string, string>;
        const imageMsg = messages.find(m => m.images && m.images.length > 0);
        if (imageMsg?.images?.[0]) {
          cacheAnalysis({
            imageUrl: `analyzed-${Date.now()}`,
            analysis: parsed.analysis as Record<string, unknown>,
            jewelryType: (analysis.assets || '').includes('ring') ? 'ring' : (analysis.assets || '').includes('necklace') ? 'necklace' : undefined,
            lighting: analysis.lighting,
            mood: analysis.mood,
          }).catch(() => {});
        }
      }
    } catch { /* non-critical */ }

    return { success: true, data, rawJson: rawText };
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      return { success: false, error: `AI error (${error.status}).`, code: 'AI_ERROR', status: 500 };
    }
    return { success: false, error: 'An unexpected error occurred.', code: 'UNKNOWN', status: 500 };
  }
}
