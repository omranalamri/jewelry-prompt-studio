import { NextRequest } from 'next/server';
import { getAnthropicClient, callWithFallback } from '@/lib/anthropic';
import { CREATIVE_DIRECTOR_CHAT_PROMPT } from '@/lib/prompts/creative-director-chat';
import { parseClaudeJSON } from '@/lib/utils/parseResponse';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 90;

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

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

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages } = body as { messages: IncomingMessage[] };

    if (!messages || messages.length === 0) {
      return errorResponse('MISSING_INPUT', 'Please provide a message.', 400);
    }

    // Build Claude messages — any user message can have images
    const formatted: Anthropic.MessageParam[] = messages.map((msg) => {
      if (msg.role === 'assistant') {
        return { role: 'assistant' as const, content: msg.rawJson || msg.content };
      }

      // User message — may have images
      if (msg.images && msg.images.length > 0) {
        const blocks: Anthropic.ContentBlockParam[] = [];
        for (const img of msg.images) {
          blocks.push({
            type: 'image',
            source: {
              type: 'base64',
              media_type: img.mediaType as 'image/jpeg',
              data: img.base64,
            },
          });
        }
        blocks.push({ type: 'text', text: msg.content || 'Analyze this image.' });
        return { role: 'user' as const, content: blocks };
      }

      return { role: 'user' as const, content: msg.content };
    });

    const anthropic = getAnthropicClient();
    const message = await callWithFallback((model) =>
      anthropic.messages.create({
        model,
        max_tokens: 4000,
        system: CREATIVE_DIRECTOR_CHAT_PROMPT,
        messages: formatted,
      })
    );

    const rawText = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    const data = parseClaudeJSON(rawText);
    if (!data) {
      return errorResponse('AI_PARSE_ERROR', 'Failed to parse response. Please try again.', 500);
    }

    return Response.json({ success: true, data, rawJson: rawText });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error('Creative chat error:', error.status, error.message);
      return errorResponse('AI_ERROR', `AI error (${error.status}). Please try again.`, 500);
    }
    console.error('Creative chat error:', error);
    return errorResponse('UNKNOWN', 'An unexpected error occurred.', 500);
  }
}
