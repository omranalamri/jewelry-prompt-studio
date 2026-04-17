import { NextRequest } from 'next/server';
import { handleChatRequest } from '@/lib/chat-handler';
import { CREATIVE_DIRECTOR_CHAT_PROMPT } from '@/lib/prompts/creative-director-chat';

export const maxDuration = 90;

export async function POST(req: NextRequest) {
  const { messages } = await req.json();
  // Conversation mode — cheap Haiku turns for info gathering. Final prompt
  // synthesis runs separately on Sonnet via the generation routes.
  const result = await handleChatRequest(messages, CREATIVE_DIRECTOR_CHAT_PROMPT, { mode: 'conversation' });
  if (!result.success) {
    return Response.json({ success: false, error: result.error, code: result.code }, { status: result.status });
  }
  return Response.json(result);
}
