import { NextRequest } from 'next/server';
import { getAnthropicClient, callWithFallback } from '@/lib/anthropic';
import { REEL_STORYBOARD_PROMPT } from '@/lib/prompts/creative-director';
import { parseClaudeJSON } from '@/lib/utils/parseResponse';
import { getPersonaById } from '@/lib/creative/personas';
import { getTemplateById } from '@/lib/creative/reel-structure';
import { buildVideoPlacementFragment } from '@/lib/creative/body-placement';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 90;

function errorResponse(code: string, message: string, status: number) {
  return Response.json({ success: false, error: message, code }, { status });
}

interface ReelRequest {
  jewelryDescription: string;
  jewelryType: string;
  templateId: string;
  personaId: string;
  brandDirection?: string;
  targetAudience?: string;
  imageBase64?: string;
  imageMediaType?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body: ReelRequest = await req.json();
    const { jewelryDescription, jewelryType, templateId, personaId, brandDirection, targetAudience } = body;

    if (!jewelryDescription || !templateId || !personaId) {
      return errorResponse('MISSING_INPUT', 'Please provide jewelry description, template, and persona.', 400);
    }

    const template = getTemplateById(templateId);
    if (!template) {
      return errorResponse('INVALID_TEMPLATE', 'Unknown reel template.', 400);
    }

    const persona = getPersonaById(personaId);
    if (!persona) {
      return errorResponse('INVALID_PERSONA', 'Unknown model persona.', 400);
    }

    const placement = buildVideoPlacementFragment(jewelryType || 'ring');

    const contentBlocks: Anthropic.ContentBlockParam[] = [];

    // If image provided, include it
    if (body.imageBase64 && body.imageMediaType) {
      contentBlocks.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: body.imageMediaType as 'image/jpeg',
          data: body.imageBase64,
        },
      });
    }

    contentBlocks.push({
      type: 'text',
      text: `Create a multi-shot video reel storyboard.

JEWELRY PIECE: ${jewelryDescription}
JEWELRY TYPE: ${jewelryType || 'ring'}

REEL TEMPLATE: ${template.name}
PLATFORM: ${template.platform} (${template.aspectRatio})
TOTAL DURATION: ${template.totalDuration}s
SCENES:
${template.scenes.map(s => `  Scene ${s.id} "${s.name}" (${s.duration}s) — ${s.shotType}: ${s.promptGuidance}`).join('\n')}

MODEL PERSONA: ${persona.name} — ${persona.promptFragment}
HAND DETAILS: ${persona.handDescription}
NAIL DETAILS: ${persona.nailDescription}
${persona.bodyDescription ? `BODY: ${persona.bodyDescription}` : ''}

BODY PLACEMENT: ${placement}

${brandDirection ? `BRAND DIRECTION: ${brandDirection}` : ''}
${targetAudience ? `TARGET AUDIENCE: ${targetAudience}` : ''}

Generate a complete storyboard with production-ready prompts for each scene, plus an attention/engagement analysis.`,
    });

    const anthropic = getAnthropicClient();
    const message = await callWithFallback((model) =>
      anthropic.messages.create({
        model,
        max_tokens: 4000,
        system: REEL_STORYBOARD_PROMPT,
        messages: [{ role: 'user', content: contentBlocks }],
      })
    );

    const rawText = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map((b) => b.text)
      .join('');

    const data = parseClaudeJSON(rawText);
    if (!data) {
      return errorResponse('AI_PARSE_ERROR', 'Failed to parse storyboard. Please try again.', 500);
    }

    return Response.json({ success: true, data });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error('Creative reel error:', error.status, error.message);
      return errorResponse('AI_ERROR', `AI service error (${error.status}).`, 500);
    }
    console.error('Reel error:', error);
    return errorResponse('UNKNOWN', 'An unexpected error occurred.', 500);
  }
}
