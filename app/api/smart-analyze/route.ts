import { NextRequest } from 'next/server';
import { handleChatRequest } from '@/lib/chat-handler';
import { SMART_ANALYZE_PROMPT } from '@/lib/prompts/smart-analyze';

export const maxDuration = 90;

export async function POST(req: NextRequest) {
  const { messages } = await req.json();
  // Synthesis mode — structured jewelry fact extraction feeds the image
  // generation pipeline directly, so pay for Sonnet quality here.
  const result = await handleChatRequest(messages, SMART_ANALYZE_PROMPT, { mode: 'synthesis' });
  if (!result.success) {
    return Response.json({ success: false, error: result.error, code: result.code }, { status: result.status });
  }
  return Response.json(result);
}
