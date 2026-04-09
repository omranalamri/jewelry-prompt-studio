import { NextRequest } from 'next/server';
import { getAnthropicClient, callWithFallback } from '@/lib/anthropic';
import { VISION_SYSTEM_PROMPT } from '@/lib/prompts/vision';
import { fileToImageBlock } from '@/lib/utils/imageUtils';
import { parseClaudeJSON } from '@/lib/utils/parseResponse';
import { VisionResult } from '@/types/prompts';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get('image') as File | null;
    const visionText = formData.get('visionText') as string || '';
    const outputType = formData.get('outputType') as string || 'both';

    if (!imageFile) {
      return errorResponse('MISSING_IMAGE', 'Please upload an image to continue.', 400);
    }

    if (!visionText.trim()) {
      return errorResponse('MISSING_VISION', 'Please describe your creative vision.', 400);
    }

    const imageBuffer = Buffer.from(await imageFile.arrayBuffer());
    const imageBlock = await fileToImageBlock(imageBuffer, imageFile.type);

    const contentBlocks: Anthropic.ContentBlockParam[] = [
      { type: 'text', text: 'UPLOADED IMAGE:' },
      imageBlock,
      {
        type: 'text',
        text: `CREATIVE VISION: ${visionText}\n\nOUTPUT TYPE: ${outputType}`,
      },
    ];

    const anthropic = getAnthropicClient();
    const message = await callWithFallback((model) =>
      anthropic.messages.create({
        model,
        max_tokens: 2000,
        system: VISION_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: contentBlocks }],
      })
    );

    const rawText = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    const data = parseClaudeJSON<VisionResult>(rawText);
    if (!data) {
      return errorResponse('AI_PARSE_ERROR', 'Something went wrong with the AI response. Please try again.', 500);
    }

    const sessionId = crypto.randomUUID();
    return Response.json({ success: true, data, sessionId });
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
    console.error('Vision error:', error);
    return errorResponse('UNKNOWN', 'An unexpected error occurred.', 500);
  }
}
