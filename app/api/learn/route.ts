import { getDb } from '@/lib/db';
import { getAnthropicClient, callWithFallback } from '@/lib/anthropic';
import { parseClaudeJSON } from '@/lib/utils/parseResponse';
import { refreshComboPerformance } from '@/lib/learning/smart-recommendations';
import Anthropic from '@anthropic-ai/sdk';

export const maxDuration = 120;

export async function POST() {
  try {
    const sql = getDb();

    // Gather all rated generations from last 30 days
    const rated = await sql`
      SELECT jewelry_type, generation_model, camera_preset_id, persona_id,
        user_rating, user_feedback, feedback_tags, was_regenerated, is_favorite,
        prompt_text, had_reference
      FROM generations
      WHERE user_rating IS NOT NULL AND created_at > now() - interval '30 days'
      ORDER BY created_at DESC
      LIMIT 500
    `;

    if (rated.length < 5) {
      return Response.json({ success: true, data: { message: 'Not enough rated generations yet. Need at least 5.', patternsFound: 0 } });
    }

    // Group by jewelry type + model
    const groups: Record<string, { ratings: number[]; feedback: string[]; tags: string[]; count: number; favorites: number; regenerated: number }> = {};
    for (const r of rated) {
      const key = `${r.jewelry_type || 'unknown'}|${r.generation_model}`;
      if (!groups[key]) groups[key] = { ratings: [], feedback: [], tags: [], count: 0, favorites: 0, regenerated: 0 };
      groups[key].ratings.push(r.user_rating as number);
      if (r.user_feedback) groups[key].feedback.push(r.user_feedback as string);
      if (r.feedback_tags) groups[key].tags.push(...(r.feedback_tags as string[]));
      groups[key].count++;
      if (r.is_favorite) groups[key].favorites++;
      if (r.was_regenerated) groups[key].regenerated++;
    }

    // Build the analysis prompt for Claude
    const groupSummaries = Object.entries(groups).map(([key, data]) => {
      const [jewelry, model] = key.split('|');
      const avgRating = (data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length).toFixed(1);
      const tagCounts: Record<string, number> = {};
      data.tags.forEach(t => { tagCounts[t] = (tagCounts[t] || 0) + 1; });
      const topTags = Object.entries(tagCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

      return `[${jewelry} + ${model}] N=${data.count}, avg=${avgRating}, fav=${data.favorites}, regen=${data.regenerated}
  Tags: ${topTags.map(([t, c]) => `${t}(${c})`).join(', ') || 'none'}
  Feedback: ${data.feedback.slice(0, 3).join(' | ') || 'none'}`;
    }).join('\n\n');

    const anthropic = getAnthropicClient();
    const message = await callWithFallback((model) =>
      anthropic.messages.create({
        model,
        max_tokens: 2000,
        system: 'You analyze user feedback on AI-generated jewelry marketing content to extract actionable patterns for improving prompt quality. Respond with valid JSON only.',
        messages: [{
          role: 'user',
          content: `Analyze this feedback data from ${rated.length} rated jewelry generations:

${groupSummaries}

Extract:
1. RECURRING ISSUES — problems that keep happening, with specific prompt fixes
2. SUCCESS PATTERNS — what consistently produces high ratings, as reusable prompt fragments
3. MODEL STRENGTHS — which models are best for which jewelry types

Respond as JSON:
{
  "patterns": [
    {"type": "issue|success|model-strength", "description": "...", "jewelryTypes": ["ring"], "models": ["nano-banana-pro"], "suggestedChange": "Add this to prompts: ...", "evidence": 5}
  ],
  "fragments": [
    {"category": "lighting|composition|material|mood", "text": "specific prompt text that works well", "jewelryTypes": ["ring","necklace"], "models": ["nano-banana-pro"]}
  ]
}`,
        }],
      })
    );

    const rawText = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === 'text')
      .map(b => b.text).join('');

    const result = parseClaudeJSON<{
      patterns: { type: string; description: string; jewelryTypes: string[]; models: string[]; suggestedChange: string; evidence: number }[];
      fragments: { category: string; text: string; jewelryTypes: string[]; models: string[] }[];
    }>(rawText);

    if (!result) {
      return Response.json({ success: true, data: { message: 'Could not parse patterns.', patternsFound: 0 } });
    }

    // Save patterns
    let patternsInserted = 0;
    for (const p of result.patterns || []) {
      await sql`INSERT INTO feedback_patterns (pattern_type, description, evidence_count, jewelry_types, models, suggested_prompt_change)
        VALUES (${p.type === 'issue' ? 'recurring-issue' : p.type === 'success' ? 'success-pattern' : 'model-strength'}, ${p.description}, ${p.evidence || 1}, ${p.jewelryTypes || []}, ${p.models || []}, ${p.suggestedChange || null})`;
      patternsInserted++;
    }

    // Save fragments
    let fragmentsInserted = 0;
    for (const f of result.fragments || []) {
      await sql`INSERT INTO prompt_fragments (category, fragment_text, applies_to_jewelry, applies_to_model, source)
        VALUES (${f.category}, ${f.text}, ${f.jewelryTypes || []}, ${f.models || []}, 'claude-extracted')`;
      fragmentsInserted++;
    }

    // Mark high-evidence patterns as applied (they're auto-injected via prompt builder)
    await sql`UPDATE feedback_patterns SET is_applied = true WHERE evidence_count >= 3 AND is_applied = false`;

    // Log which patterns were committed
    const appliedPatterns = await sql`SELECT description FROM feedback_patterns WHERE is_applied = true AND evidence_count >= 3`;

    // Refresh combo performance
    await refreshComboPerformance();

    // Log the commit
    await sql`INSERT INTO system_changelog (change_type, description, details)
      VALUES ('patterns-committed', ${`Committed ${appliedPatterns.length} patterns to prompt system. ${fragmentsInserted} new fragments active.`}, ${JSON.stringify({ appliedCount: appliedPatterns.length, newFragments: fragmentsInserted })})`;


    return Response.json({
      success: true,
      data: {
        message: `Analyzed ${rated.length} generations. Found ${patternsInserted} patterns and ${fragmentsInserted} prompt fragments.`,
        patternsFound: patternsInserted,
        fragmentsFound: fragmentsInserted,
        patterns: result.patterns,
        fragments: result.fragments,
      },
    });
  } catch (error) {
    console.error('Learn error:', error);
    return Response.json({ success: false, error: 'Learning extraction failed.' }, { status: 500 });
  }
}
