import { NextRequest } from 'next/server';
import { handleChatRequest } from '@/lib/chat-handler';
import { SMART_ANALYZE_PROMPT } from '@/lib/prompts/smart-analyze';

export const maxDuration = 90;

export async function POST(req: NextRequest) {
  const { messages } = await req.json();
  const result = await handleChatRequest(messages, SMART_ANALYZE_PROMPT);
  if (!result.success) {
    return Response.json({ success: false, error: result.error, code: result.code }, { status: result.status });
  }
  return Response.json(result);
}
