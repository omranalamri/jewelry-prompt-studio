import { NextRequest } from 'next/server';
import { getAnthropicClient, callWithFallback } from '@/lib/anthropic';
import { CONCEPT_SYSTEM_PROMPT } from '@/lib/prompts/concept';
import { parseClaudeJSON } from '@/lib/utils/parseResponse';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

interface ConceptResult {
  message: string;
  ready: boolean;
  concept?: string;
  prompts?: {
    midjourney: string | null;
    dalle: string | null;
    runway: string | null;
    kling: string | null;
  };
  recommendation?: string;
  reason?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, sessionId } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return errorResponse('MISSING_INPUT', 'Please provide a message.', 400);
    }

    const anthropic = getAnthropicClient();
    const formattedMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const message = await callWithFallback((model) =>
      anthropic.messages.create({
        model,
        max_tokens: 1500,
        system: CONCEPT_SYSTEM_PROMPT,
        messages: formattedMessages,
      })
    );

    const rawText = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    const data = parseClaudeJSON<ConceptResult>(rawText);
    if (!data) {
      return errorResponse('AI_PARSE_ERROR', 'Something went wrong with the AI response. Please try again.', 500);
    }

    return Response.json({
      success: true,
      data,
      sessionId: sessionId || crypto.randomUUID(),
    });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error('Anthropic API error:', error.status, error.message);
      if (error.status === 429) {
        return errorResponse('AI_RATE_LIMIT', 'High demand right now — please wait 30 seconds and try again.', 429);
      }
      if (error.status === 401 || error.status === 403) {
        return errorResponse('AI_AUTH_ERROR', 'API key is invalid or expired. Please check your ANTHROPIC_API_KEY.', 500);
      }
      return errorResponse('AI_ERROR', `AI service error (${error.status}). Please try again.`, 500);
    }
    console.error('Concept error:', error);
    return errorResponse('UNKNOWN', 'An unexpected error occurred.', 500);
  }
}
