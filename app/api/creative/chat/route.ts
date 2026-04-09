import { NextRequest } from 'next/server';
import { getAnthropicClient, callWithFallback } from '@/lib/anthropic';
import { CREATIVE_DIRECTOR_CHAT_PROMPT } from '@/lib/prompts/creative-director-chat';
import { parseClaudeJSON } from '@/lib/utils/parseResponse';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 90;

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, imageBase64, imageMediaType } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return errorResponse('MISSING_INPUT', 'Please provide a message.', 400);
    }

    // Build the message history for Claude
    const formattedMessages: Anthropic.MessageParam[] = [];

    for (const msg of messages) {
      if (msg.role === 'user') {
        // First user message might include an image
        if (msg.hasImage && imageBase64 && imageMediaType && formattedMessages.length === 0) {
          formattedMessages.push({
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: imageMediaType as 'image/jpeg',
                  data: imageBase64,
                },
              },
              { type: 'text', text: msg.content },
            ],
          });
        } else {
          formattedMessages.push({ role: 'user', content: msg.content });
        }
      } else {
        // For assistant messages, send the original raw JSON so Claude has full context
        formattedMessages.push({ role: 'assistant', content: msg.rawJson || msg.content });
      }
    }

    const anthropic = getAnthropicClient();
    const message = await callWithFallback((model) =>
      anthropic.messages.create({
        model,
        max_tokens: 4000,
        system: CREATIVE_DIRECTOR_CHAT_PROMPT,
        messages: formattedMessages,
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

    return Response.json({
      success: true,
      data,
      rawJson: rawText,
    });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error('Creative chat error:', error.status, error.message);
      return errorResponse('AI_ERROR', `AI error (${error.status}). Please try again.`, 500);
    }
    console.error('Creative chat error:', error);
    return errorResponse('UNKNOWN', 'An unexpected error occurred.', 500);
  }
}
