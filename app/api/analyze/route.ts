import { NextRequest } from 'next/server';
import { getAnthropicClient } from '@/lib/anthropic';
import { ANALYZE_SYSTEM_PROMPT } from '@/lib/prompts/analyze';
import { fileToImageBlock } from '@/lib/utils/imageUtils';
import { parseClaudeJSON } from '@/lib/utils/parseResponse';
import { AnalyzeResult } from '@/types/prompts';
import Anthropic from '@anthropic-ai/sdk';

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const referenceFile = formData.get('referenceImage') as File | null;
    const assetFiles = formData.getAll('assetImages') as File[];
    const context = formData.get('context') as string || '';
    const outputType = formData.get('outputType') as string || 'both';

    if (!referenceFile) {
      return errorResponse('MISSING_REFERENCE', 'Please upload a reference image to continue.', 400);
    }

    if (assetFiles.length > 3) {
      return errorResponse('TOO_MANY_ASSETS', 'Maximum 3 asset images allowed.', 400);
    }

    // Convert files to Claude image blocks
    const referenceBuffer = Buffer.from(await referenceFile.arrayBuffer());
    const referenceBlock = await fileToImageBlock(referenceBuffer, referenceFile.type);

    const contentBlocks: Anthropic.ContentBlockParam[] = [
      { type: 'text', text: 'REFERENCE IMAGE:' },
      referenceBlock,
    ];

    for (let i = 0; i < assetFiles.length; i++) {
      const assetBuffer = Buffer.from(await assetFiles[i].arrayBuffer());
      const assetBlock = await fileToImageBlock(assetBuffer, assetFiles[i].type);
      contentBlocks.push(
        { type: 'text', text: `JEWELRY ASSET ${i + 1}:` },
        assetBlock
      );
    }

    contentBlocks.push({
      type: 'text',
      text: `OUTPUT TYPE: ${outputType}\n${context ? `ADDITIONAL CONTEXT: ${context}` : 'No additional context provided.'}`,
    });

    const anthropic = getAnthropicClient();
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250514',
      max_tokens: 2000,
      system: ANALYZE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: contentBlocks }],
    });

    const rawText = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    const data = parseClaudeJSON<AnalyzeResult>(rawText);
    if (!data) {
      return errorResponse('AI_PARSE_ERROR', 'Something went wrong with the AI response. Please try again.', 500);
    }

    const sessionId = crypto.randomUUID();
    return Response.json({ success: true, data, sessionId });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      if (error.status === 429) {
        return errorResponse('AI_RATE_LIMIT', 'High demand right now — please wait 30 seconds and try again.', 429);
      }
      return errorResponse('AI_ERROR', 'AI service error. Please try again.', 500);
    }
    console.error('Analyze error:', error);
    return errorResponse('UNKNOWN', 'An unexpected error occurred.', 500);
  }
}
