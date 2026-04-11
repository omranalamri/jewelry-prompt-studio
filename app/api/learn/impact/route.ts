import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const sql = getDb();

    // Rating trend over time — are ratings improving?
    const ratingTrend = await sql`
      SELECT
        DATE(created_at) as date,
        AVG(user_rating) as avg_rating,
        COUNT(*) as count
      FROM generations
      WHERE user_rating IS NOT NULL AND created_at > now() - interval '60 days'
      GROUP BY DATE(created_at)
      ORDER BY date
    `;

    // Before vs after patterns were extracted
    const patternsApplied = await sql`SELECT created_at FROM feedback_patterns ORDER BY created_at ASC LIMIT 1`;
    const patternDate = patternsApplied.length > 0 ? patternsApplied[0].created_at : null;

    let beforeAfter = null;
    if (patternDate) {
      const before = await sql`
        SELECT AVG(user_rating) as avg, COUNT(*) as count
        FROM generations WHERE user_rating IS NOT NULL AND created_at < ${patternDate}
      `;
      const after = await sql`
        SELECT AVG(user_rating) as avg, COUNT(*) as count
        FROM generations WHERE user_rating IS NOT NULL AND created_at >= ${patternDate}
      `;
      beforeAfter = {
        before: { avg: parseFloat(before[0]?.avg as string || '0'), count: parseInt(before[0]?.count as string || '0') },
        after: { avg: parseFloat(after[0]?.avg as string || '0'), count: parseInt(after[0]?.count as string || '0') },
        patternDate,
      };
    }

    // Learned fragments and their impact
    const fragments = await sql`
      SELECT fragment_text, category, applies_to_jewelry, times_used, avg_rating_when_used, lift, source
      FROM prompt_fragments WHERE is_active = true ORDER BY lift DESC LIMIT 20
    `;

    // Known issues and whether they're being addressed
    const patterns = await sql`
      SELECT pattern_type, description, evidence_count, suggested_prompt_change, is_applied, jewelry_types, models
      FROM feedback_patterns ORDER BY evidence_count DESC LIMIT 20
    `;

    // Model performance comparison over time
    const modelTrend = await sql`
      SELECT generation_model,
        COUNT(*) as total,
        AVG(user_rating) as avg_rating,
        AVG(CASE WHEN was_regenerated THEN 1.0 ELSE 0.0 END) as regen_rate,
        COUNT(CASE WHEN is_favorite THEN 1 END) as favorites
      FROM generations WHERE user_rating IS NOT NULL
      GROUP BY generation_model ORDER BY avg_rating DESC
    `;

    // Validation impact — how many prompts are we catching and fixing
    const validationStats = await sql`
      SELECT COUNT(*) as total_generations FROM generations
    `;

    // Hallucination issues over time
    const issuesByTag = await sql`
      SELECT unnest(feedback_tags) as tag, COUNT(*) as count,
        MIN(created_at) as first_seen, MAX(created_at) as last_seen
      FROM generations WHERE feedback_tags != '{}'
      GROUP BY tag ORDER BY count DESC LIMIT 15
    `;

    return Response.json({
      success: true,
      data: {
        ratingTrend,
        beforeAfter,
        fragments,
        patterns,
        modelTrend,
        totalGenerations: parseInt(validationStats[0]?.total_generations as string || '0'),
        issuesByTag,
        summary: {
          totalFragments: fragments.length,
          totalPatterns: patterns.length,
          appliedPatterns: patterns.filter(p => p.is_applied).length,
          avgLift: fragments.length > 0 ? fragments.reduce((s, f) => s + (parseFloat(f.lift as string) || 0), 0) / fragments.length : 0,
        },
      },
    });
  } catch (error) {
    console.error('Impact error:', error);
    return Response.json({ success: false, error: 'Could not load impact data.' }, { status: 500 });
  }
}
