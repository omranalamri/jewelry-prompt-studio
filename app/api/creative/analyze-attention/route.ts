import { NextRequest } from 'next/server';
import { getAnthropicClient, callWithFallback } from '@/lib/anthropic';
import { ATTENTION_ANALYSIS_PROMPT } from '@/lib/prompts/creative-director';
import { parseClaudeJSON } from '@/lib/utils/parseResponse';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const imageFile = formData.get('image') as File | null;
    const imageUrl = formData.get('imageUrl') as string | null;
    const context = formData.get('context') as string || '';

    const contentBlocks: Anthropic.ContentBlockParam[] = [];

    if (imageFile) {
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      contentBlocks.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: imageFile.type as 'image/jpeg',
          data: buffer.toString('base64'),
        },
      });
    } else if (imageUrl) {
      contentBlocks.push({
        type: 'image',
        source: { type: 'url', url: imageUrl },
      });
    } else {
      return errorResponse('MISSING_IMAGE', 'Provide an image to analyze.', 400);
    }

    contentBlocks.push({
      type: 'text',
      text: `Analyze this jewelry marketing image for visual attention patterns, engagement prediction, and technical quality. ${context ? `Context: ${context}` : ''}

Provide a comprehensive analysis covering:
1. Attention map — where does the eye go first, second, third?
2. Engagement prediction — scroll-stop probability, dwell time, desire score
3. Technical analysis — lighting, composition, color harmony, product clarity
4. Platform fit — how well does this work for Instagram, TikTok, Pinterest, campaign
5. Specific improvements — actionable suggestions to increase engagement`,
    });

    const anthropic = getAnthropicClient();
    const message = await callWithFallback((model) =>
      anthropic.messages.create({
        model,
        max_tokens: 2000,
        system: ATTENTION_ANALYSIS_PROMPT,
        messages: [{ role: 'user', content: contentBlocks }],
      })
    );

    const rawText = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    const data = parseClaudeJSON(rawText);
    if (!data) {
      return errorResponse('AI_PARSE_ERROR', 'Failed to parse analysis.', 500);
    }

    return Response.json({ success: true, data });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error('Attention analysis error:', error.status, error.message);
      return errorResponse('AI_ERROR', `AI error (${error.status}).`, 500);
    }
    console.error('Attention error:', error);
    return errorResponse('UNKNOWN', 'An unexpected error occurred.', 500);
  }
}
