import { getAnthropicClient, callWithFallback } from '@/lib/anthropic';
import { parseClaudeJSON } from '@/lib/utils/parseResponse';
import { buildEnhancedPrompt } from '@/lib/learning/prompt-builder';
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

export async function handleChatRequest(
  messages: IncomingMessage[],
  systemPrompt: string,
  jewelryType?: string
): Promise<{ success: true; data: unknown; rawJson: string } | { success: false; error: string; code: string; status: number }> {
  if (!messages || messages.length === 0) {
    return { success: false, error: 'Please provide a message.', code: 'MISSING_INPUT', status: 400 };
  }

  // Enhance the system prompt with learned knowledge
  const enhancedPrompt = await buildEnhancedPrompt({
    basePrompt: systemPrompt,
    jewelryType,
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

  try {
    const anthropic = getAnthropicClient();
    const message = await callWithFallback((model) =>
      anthropic.messages.create({ model, max_tokens: 4000, system: enhancedPrompt, messages: formatted })
    );

    const rawText = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    const data = parseClaudeJSON(rawText);
    if (!data) {
      return { success: false, error: 'Failed to parse response.', code: 'AI_PARSE_ERROR', status: 500 };
    }

    return { success: true, data, rawJson: rawText };
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      return { success: false, error: `AI error (${error.status}).`, code: 'AI_ERROR', status: 500 };
    }
    return { success: false, error: 'An unexpected error occurred.', code: 'UNKNOWN', status: 500 };
  }
}
