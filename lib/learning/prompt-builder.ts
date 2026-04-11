import { getDb } from '@/lib/db';

interface PromptContext {
  basePrompt: string;
  jewelryType?: string;
}

/**
 * Enhances a base system prompt with learned best practices and pitfalls.
 * The base prompt stays the same — this appends learned knowledge.
 */
export async function buildEnhancedPrompt(ctx: PromptContext): Promise<string> {
  let prompt = ctx.basePrompt;

  if (!ctx.jewelryType) return prompt;

  try {
    const sql = getDb();

    // Get learned positive fragments
    const fragments = await sql`
      SELECT fragment_text FROM prompt_fragments
      WHERE is_active = true
        AND (applies_to_jewelry = '{}' OR ${ctx.jewelryType} = ANY(applies_to_jewelry))
        AND lift > 0
      ORDER BY lift DESC
      LIMIT 5
    `;

    // Get known pitfalls
    const pitfalls = await sql`
      SELECT description, suggested_prompt_change FROM feedback_patterns
      WHERE pattern_type = 'recurring-issue'
        AND (jewelry_types = '{}' OR ${ctx.jewelryType} = ANY(jewelry_types))
        AND evidence_count >= 3
      ORDER BY evidence_count DESC
      LIMIT 3
    `;

    // Get best-performing reference style for this jewelry type
    const topRef = await sql`
      SELECT lighting_description, mood FROM reference_analyses
      WHERE jewelry_type = ${ctx.jewelryType}
        AND avg_generation_rating >= 4
      ORDER BY avg_generation_rating DESC, times_used DESC
      LIMIT 1
    `;

    // Append learned knowledge
    const sections: string[] = [];

    if (fragments.length > 0) {
      sections.push(
        `LEARNED BEST PRACTICES (from user-rated generations for ${ctx.jewelryType}):\n` +
        fragments.map(f => `- ${f.fragment_text}`).join('\n')
      );
    }

    if (pitfalls.length > 0) {
      sections.push(
        `KNOWN ISSUES TO AVOID:\n` +
        pitfalls.map(p => `- AVOID: ${p.description}. Instead: ${p.suggested_prompt_change || 'See above best practices.'}`).join('\n')
      );
    }

    if (topRef.length > 0 && topRef[0].lighting_description) {
      sections.push(
        `TOP-PERFORMING STYLE (avg rating 4+):\n` +
        `- Lighting: ${topRef[0].lighting_description}\n` +
        `- Mood: ${topRef[0].mood || 'luxury editorial'}`
      );
    }

    if (sections.length > 0) {
      prompt += '\n\n' + sections.join('\n\n');
    }
  } catch {
    // If learning DB fails, just use the base prompt — never break generation
  }

  return prompt;
}
