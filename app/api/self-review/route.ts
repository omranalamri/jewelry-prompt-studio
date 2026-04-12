import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { getAnthropicClient, callWithFallback } from '@/lib/anthropic';
import { parseClaudeJSON } from '@/lib/utils/parseResponse';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 300;

const SELF_REVIEW_PROMPT = `You are a strict jewelry photography critic reviewing AI-generated images. Rate honestly — do NOT be generous. A real jewelry brand would reject anything below professional quality.

For each image, score 1-5:
- 1 = Unusable (wrong design, major artifacts, hallucinated details)
- 2 = Poor (recognizable but clearly AI, wrong proportions, bad lighting)
- 3 = Acceptable (decent but not professional quality, minor issues)
- 4 = Good (professional quality, minor nitpicks only)
- 5 = Excellent (could be used in a real campaign immediately)

JUDGE AGAINST THESE CRITERIA:
- Does the jewelry piece match the original? (design fidelity)
- Do metals look real or plastic? (material realism)
- Do stones show proper fire/scintillation? (gemstone quality)
- Is the lighting professional? (lighting quality)
- Is the composition clean? (composition)
- Are proportions correct on body? (body placement)
- Any AI artifacts? (technical quality)

Be SPECIFIC about what's wrong. Don't just say "good lighting" — say "key light from above-left creates natural shadow under the band but the rim highlight is too uniform."

Respond with valid JSON:
{
  "reviews": [
    {
      "imageUrl": "the URL",
      "rating": 1-5,
      "comment": "Honest 2-3 sentence review",
      "strengths": ["specific strength"],
      "weaknesses": ["specific weakness"],
      "improvementSuggestion": "What prompt change would fix the main issue"
    }
  ],
  "overallAssessment": "Summary of the batch quality",
  "promptImprovements": [
    {"current": "what the prompt currently does wrong", "suggested": "specific text to add or change"}
  ]
}`;

export async function POST(req: NextRequest) {
  try {
    const { limit = 20 } = await req.json().catch(() => ({ limit: 20 }));

    const sql = getDb();

    // Get recent unrated generations that have result URLs
    const unrated = await sql`
      SELECT id, result_url, prompt_text, generation_model, jewelry_type, reference_image_url
      FROM generations
      WHERE result_url IS NOT NULL AND user_rating IS NULL
      ORDER BY created_at DESC
      LIMIT ${limit}
    `;

    if (unrated.length === 0) {
      return Response.json({ success: true, data: { message: 'No unrated generations to review.', reviewed: 0 } });
    }

    // Build review request with actual images
    const contentBlocks: Anthropic.ContentBlockParam[] = [];

    for (const gen of unrated.slice(0, 8)) { // Max 8 images per review (API limits)
      try {
        contentBlocks.push(
          { type: 'image', source: { type: 'url', url: gen.result_url as string } },
          { type: 'text', text: `[Image ${gen.id}] Model: ${gen.generation_model} | Type: ${gen.jewelry_type || '?'} | Prompt: "${(gen.prompt_text as string || '').slice(0, 150)}..."` }
        );
      } catch { /* skip if image can't load */ }
    }

    if (contentBlocks.length === 0) {
      return Response.json({ success: true, data: { message: 'Could not load any images for review.', reviewed: 0 } });
    }

    contentBlocks.push({
      type: 'text',
      text: `Review these ${Math.floor(contentBlocks.length / 2)} AI-generated jewelry images. Be honest and strict — rate each 1-5 and explain what needs improvement.`,
    });

    const anthropic = getAnthropicClient();
    const message = await callWithFallback((model) =>
      anthropic.messages.create({
        model,
        max_tokens: 3000,
        system: SELF_REVIEW_PROMPT,
        messages: [{ role: 'user', content: contentBlocks }],
      })
    );

    const rawText = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text).join('');

    const result = parseClaudeJSON<{
      reviews: { imageUrl: string; rating: number; comment: string; strengths: string[]; weaknesses: string[]; improvementSuggestion: string }[];
      overallAssessment: string;
      promptImprovements: { current: string; suggested: string }[];
    }>(rawText);

    if (!result) {
      return Response.json({ success: true, data: { message: 'Could not parse review.', reviewed: 0 } });
    }

    // Save ratings and feedback to generations
    let rated = 0;
    for (let i = 0; i < Math.min(result.reviews.length, unrated.length); i++) {
      const review = result.reviews[i];
      const gen = unrated[i];
      if (!review || !gen) continue;

      await sql`UPDATE generations SET
        user_rating = ${review.rating},
        user_feedback = ${review.comment},
        feedback_tags = ${review.weaknesses || []},
        rated_at = now()
        WHERE id = ${gen.id}`;
      rated++;
    }

    // Save prompt improvements as pending fragments
    let improvementsSaved = 0;
    for (const imp of result.promptImprovements || []) {
      try {
        await sql`INSERT INTO feedback_patterns (pattern_type, description, evidence_count, suggested_prompt_change)
          VALUES ('self-review', ${imp.current}, 1, ${imp.suggested})`;
        improvementsSaved++;
      } catch { /* */ }
    }

    // Log
    await sql`INSERT INTO system_changelog (change_type, description, details)
      VALUES ('self-review', ${`Self-reviewed ${rated} generations. Avg rating: ${(result.reviews.reduce((s, r) => s + r.rating, 0) / result.reviews.length).toFixed(1)}/5. ${improvementsSaved} improvements identified.`}, ${JSON.stringify({
        rated,
        avgRating: result.reviews.reduce((s, r) => s + r.rating, 0) / result.reviews.length,
        improvements: improvementsSaved,
        overallAssessment: result.overallAssessment,
      })})`;

    return Response.json({
      success: true,
      data: {
        message: `Self-reviewed ${rated} generations. Average self-rating: ${(result.reviews.reduce((s, r) => s + r.rating, 0) / result.reviews.length).toFixed(1)}/5`,
        reviewed: rated,
        avgRating: result.reviews.reduce((s, r) => s + r.rating, 0) / result.reviews.length,
        reviews: result.reviews,
        overallAssessment: result.overallAssessment,
        promptImprovements: result.promptImprovements,
        improvementsSaved,
      },
    });
  } catch (error) {
    console.error('Self-review error:', error);
    return Response.json({ success: false, error: 'Self-review failed.' }, { status: 500 });
  }
}
