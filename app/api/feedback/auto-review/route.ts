import { NextRequest } from 'next/server';
import { getAnthropicClient, callWithFallback } from '@/lib/anthropic';
import { parseClaudeJSON } from '@/lib/utils/parseResponse';
import { getDb } from '@/lib/db';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 60;

const REVIEW_CRITERIA = [
  { id: 'jewelry-accuracy', name: 'Jewelry Accuracy', desc: 'Does the piece match the original design, text, engravings?' },
  { id: 'metal-realism', name: 'Metal Realism', desc: 'Does the metal look real or plastic/AI-generated?' },
  { id: 'stone-quality', name: 'Stone Quality', desc: 'Do gemstones/diamonds look realistic with proper fire and brilliance?' },
  { id: 'proportions', name: 'Proportions', desc: 'Is the jewelry the right size relative to body/hand/surface?' },
  { id: 'lighting', name: 'Lighting Quality', desc: 'Is the lighting professional, dramatic, and appropriate for the mood?' },
  { id: 'composition', name: 'Composition', desc: 'Is the framing, angle, and layout visually compelling?' },
  { id: 'background', name: 'Background', desc: 'Does the background/environment support the jewelry without distracting?' },
  { id: 'body-placement', name: 'Body Placement', desc: 'If on a body — does it look natural, proportional, and realistic?' },
  { id: 'text-engravings', name: 'Text/Engravings', desc: 'If the piece has text — is it accurately reproduced?' },
  { id: 'overall-quality', name: 'Overall AI Quality', desc: 'No artifacts, distortions, extra fingers, melted details?' },
];

export async function POST(req: NextRequest) {
  try {
    const { generationId, resultUrl, userRating, userComment } = await req.json();

    if (!resultUrl) {
      return Response.json({ success: false, error: 'Result URL required.' }, { status: 400 });
    }

    // Get the generation record for context
    const sql = getDb();
    const gens = await sql`SELECT prompt_text, generation_model, jewelry_type, reference_image_url FROM generations WHERE id = ${generationId} LIMIT 1`;
    const gen = gens[0] || {};

    const anthropic = getAnthropicClient();

    const contentBlocks: Anthropic.ContentBlockParam[] = [
      { type: 'image', source: { type: 'url', url: resultUrl } },
    ];

    // If we have the reference image, include it for comparison
    if (gen.reference_image_url) {
      contentBlocks.push(
        { type: 'text', text: 'REFERENCE IMAGE (what it should look like):' },
        { type: 'image', source: { type: 'url', url: gen.reference_image_url as string } },
      );
    }

    contentBlocks.push({
      type: 'text',
      text: `This AI-generated jewelry image received a ${userRating}/5 star rating from the user.
${userComment ? `User comment: "${userComment}"` : ''}
Original prompt: "${(gen.prompt_text as string || '').slice(0, 500)}"
Model used: ${gen.generation_model || 'unknown'}
Jewelry type: ${gen.jewelry_type || 'unknown'}

Analyze this image against these quality criteria and identify what went wrong:
${REVIEW_CRITERIA.map(c => `- ${c.name}: ${c.desc}`).join('\n')}

Respond with valid JSON:
{
  "scores": {
    ${REVIEW_CRITERIA.map(c => `"${c.id}": {"score": 1-10, "note": "brief note"}`).join(',\n    ')}
  },
  "overallScore": 1-10,
  "mainIssues": ["issue 1", "issue 2"],
  "rootCause": "The primary reason this generation failed",
  "suggestedFix": "Specific prompt change that would fix this",
  "modelNote": "Was this the right model for this task? What would work better?"
}`,
    });

    const message = await callWithFallback((model) =>
      anthropic.messages.create({
        model,
        max_tokens: 1500,
        messages: [{ role: 'user', content: contentBlocks }],
      })
    );

    const rawText = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text).join('');

    const review = parseClaudeJSON(rawText);

    // Save the auto-review back to the generation
    if (review && generationId) {
      await sql`UPDATE generations SET
        user_feedback = COALESCE(user_feedback, '') || ${userComment ? '\n[User] ' + userComment : ''} || ${'\n[Auto-Review] ' + ((review as Record<string, unknown>).rootCause || '')},
        feedback_tags = array_cat(feedback_tags, ${((review as Record<string, unknown>).mainIssues as string[]) || []})
        WHERE id = ${generationId}`;
    }

    return Response.json({ success: true, data: { review, criteria: REVIEW_CRITERIA } });
  } catch (error) {
    console.error('Auto-review error:', error);
    return Response.json({ success: false, error: 'Auto-review failed.' }, { status: 500 });
  }
}

// Return the criteria list
export async function GET() {
  return Response.json({ success: true, data: { criteria: REVIEW_CRITERIA } });
}
