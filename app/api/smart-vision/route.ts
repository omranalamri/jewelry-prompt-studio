import { NextRequest } from 'next/server';
import { handleChatRequest } from '@/lib/chat-handler';
import { SMART_VISION_PROMPT } from '@/lib/prompts/smart-vision';

export const maxDuration = 90;

export async function POST(req: NextRequest) {
  const { messages } = await req.json();
  // Synthesis mode — structured vision output feeds downstream generation
  const result = await handleChatRequest(messages, SMART_VISION_PROMPT, { mode: 'synthesis' });
  if (!result.success) {
    return Response.json({ success: false, error: result.error, code: result.code }, { status: result.status });
  }
  return Response.json(result);
}
